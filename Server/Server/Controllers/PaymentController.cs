using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Udemy_Project.Data;
using Udemy_Project.Models;
using Stripe;
using System.Net;
using System.Net.Security;
using System.Security.Authentication;

namespace Udemy_Project.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        protected ApiResponse _response;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _db;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(IConfiguration configuration, ApplicationDbContext db, ILogger<PaymentController> logger)
        {
            _configuration = configuration;
            _db = db;
            _logger = logger;
            _response = new ApiResponse();
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse>> MakePayment(string userId)
        {
            try
            {
                // Force TLS 1.2 or higher
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;

                ShoppingCart shoppingCart = await _db.ShoppingCarts
                    .Include(u => u.CartItems)
                    .ThenInclude(u => u.MenuItem)
                    .FirstOrDefaultAsync(u => u.UserId == userId);

                if (shoppingCart == null || shoppingCart.CartItems == null || !shoppingCart.CartItems.Any())
                {
                    _response.StatusCode = HttpStatusCode.BadRequest;
                    _response.IsSuccess = false;
                    _response.ErrorMessages.Add("Shopping cart is empty");
                    return BadRequest(_response);
                }

                StripeConfiguration.ApiKey = _configuration["StripeSettings:SecretKey"];

                shoppingCart.CartTotal = shoppingCart.CartItems.Sum(u => u.Quantity * u.MenuItem.Price);

                PaymentIntent intent = null;
                int maxRetries = 3;

                for (int i = 0; i < maxRetries; i++)
                {
                    try
                    {
                        if (string.IsNullOrEmpty(shoppingCart.StripePaymentIntentId))
                        {
                            // Create a new PaymentIntent
                            var options = new PaymentIntentCreateOptions
                            {
                                Amount = (long)(shoppingCart.CartTotal * 100),
                                Currency = "usd",
                                PaymentMethodTypes = new List<string> { "card" },
                            };
                            var service = new PaymentIntentService();
                            intent = await service.CreateAsync(options);
                            shoppingCart.StripePaymentIntentId = intent.Id;
                        }
                        else
                        {
                            // Retrieve and update existing PaymentIntent
                            var service = new PaymentIntentService();
                            intent = await service.GetAsync(shoppingCart.StripePaymentIntentId);
                            var options = new PaymentIntentUpdateOptions
                            {
                                Amount = (long)(shoppingCart.CartTotal * 100),
                            };
                            intent = await service.UpdateAsync(shoppingCart.StripePaymentIntentId, options);
                        }

                        break; // If successful, break out of the retry loop
                    }
                    catch (StripeException stripeEx)
                    {
                        _logger.LogError($"Stripe API error: {stripeEx.Message}");
                        if (i == maxRetries - 1) throw; // If this was the last retry, rethrow the exception
                        await Task.Delay(1000 * (int)Math.Pow(2, i)); // Exponential backoff
                    }
                }

                if (intent == null)
                {
                    throw new Exception("Failed to create or update PaymentIntent after multiple retries.");
                }

                shoppingCart.ClientSecret = intent.ClientSecret;
                await _db.SaveChangesAsync();

                _response.Result = shoppingCart;
                _response.StatusCode = HttpStatusCode.OK;
                return Ok(_response);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error in MakePayment: {ex.Message}");
                _response.IsSuccess = false;
                _response.ErrorMessages = new List<string> { ex.Message };
                _response.StatusCode = HttpStatusCode.InternalServerError;
                return StatusCode((int)HttpStatusCode.InternalServerError, _response);
            }
        }
    }
}