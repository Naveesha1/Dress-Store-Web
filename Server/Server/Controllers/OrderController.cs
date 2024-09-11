using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Udemy_Project.Data;
using Udemy_Project.Models;
using Udemy_Project.Models.Dto;
//using Udemy_Project.Services;
using Udemy_Project.Utility;
using System.Threading.Tasks;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;


namespace Udemy_Project.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private ApiResponse _response;
        private readonly ILogger<OrderController> _logger;

        public OrderController(ApplicationDbContext db, ILogger<OrderController> logger)
        {
            _db = db;
            _logger = logger;
            _response = new ApiResponse();
            
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse>> GetOrders(string? userId,
            string searchString, string status, int pageNumber = 1, int pageSize = 5)
        {
            try
            {
                IEnumerable<OrderHeader> orderHeaders =
                    _db.OrderHeaders.Include(u => u.OrderDetails)
                    .ThenInclude(u => u.MenuItem)
                    .OrderByDescending(u => u.OrderHeaderId);



                if (!string.IsNullOrEmpty(userId))
                {
                    orderHeaders = orderHeaders.Where(u => u.ApplicationUserId == userId);
                }

                if (!string.IsNullOrEmpty(searchString))
                {
                    orderHeaders = orderHeaders
                        .Where(u => u.PickupPhoneNumber.ToLower().Contains(searchString.ToLower()) ||
                    u.PickupEmail.ToLower().Contains(searchString.ToLower())
                    || u.PickupName.ToLower().Contains(searchString.ToLower()));
                }
                if (!string.IsNullOrEmpty(status))
                {
                    orderHeaders = orderHeaders.Where(u => u.Status.ToLower() == status.ToLower());
                }

                Pagination pagination = new()
                {
                    CurrentPage = pageNumber,
                    PageSize = pageSize,
                    TotalRecords = orderHeaders.Count(),
                };

                Response.Headers.Add("X-Pagination", JsonSerializer.Serialize(pagination));

                _response.Result = orderHeaders.Skip((pageNumber - 1) * pageSize).Take(pageSize);
                _response.StatusCode = HttpStatusCode.OK;
                return Ok(_response);
            }
            catch (Exception ex)
            {
                _response.IsSuccess = false;
                _response.ErrorMessages
                     = new List<string>() { ex.ToString() };
            }
            return _response;
        }



        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse>> GetOrders(int id)
        {
            try
            {
                if (id == 0)
                {
                    _response.StatusCode = HttpStatusCode.BadRequest;
                    return BadRequest(_response);
                }


                var orderHeaders = _db.OrderHeaders.Include(u => u.OrderDetails)
                    .ThenInclude(u => u.MenuItem)
                    .Where(u => u.OrderHeaderId == id);
                if (orderHeaders == null)
                {
                    _response.StatusCode = HttpStatusCode.NotFound;
                    return NotFound(_response);
                }
                _response.Result = orderHeaders;
                _response.StatusCode = HttpStatusCode.OK;
                return Ok(_response);
            }
            catch (Exception ex)
            {
                _response.IsSuccess = false;
                _response.ErrorMessages
                     = new List<string>() { ex.ToString() };
            }
            return _response;
        }


        [HttpPost]
        public async Task<ActionResult<ApiResponse>> CreateOrder([FromBody] OrderHeaderCreateDTO orderHeaderDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _response.StatusCode = HttpStatusCode.BadRequest;
                    _response.IsSuccess = false;
                    _response.ErrorMessages = new List<string> { "Invalid model state" };
                    return BadRequest(_response);
                }

                // Check if the ApplicationUserId exists
                var userExists = await _db.Users.AnyAsync(u => u.Id == orderHeaderDTO.ApplicationUserId);
                if (!userExists)
                {
                    _response.StatusCode = HttpStatusCode.BadRequest;
                    _response.IsSuccess = false;
                    _response.ErrorMessages = new List<string> { "Invalid ApplicationUserId. User does not exist." };
                    return BadRequest(_response);
                }

                // Check if all MenuItemIds exist
                var menuItemIds = orderHeaderDTO.OrderDetailsDTO.Select(od => od.MenuItemId).Distinct().ToList();
                var existingMenuItemIds = await _db.MenuItems.Where(mi => menuItemIds.Contains(mi.Id)).Select(mi => mi.Id).ToListAsync();
                var invalidMenuItemIds = menuItemIds.Except(existingMenuItemIds).ToList();

                if (invalidMenuItemIds.Any())
                {
                    _response.StatusCode = HttpStatusCode.BadRequest;
                    _response.IsSuccess = false;
                    _response.ErrorMessages = new List<string> { $"Invalid MenuItemIds: {string.Join(", ", invalidMenuItemIds)}" };
                    return BadRequest(_response);
                }

                OrderHeader order = new()
                {
                    ApplicationUserId = orderHeaderDTO.ApplicationUserId,
                    PickupEmail = orderHeaderDTO.PickupEmail,
                    PickupName = orderHeaderDTO.PickupName,
                    PickupPhoneNumber = orderHeaderDTO.PickupPhoneNumber,
                    OrderTotal = orderHeaderDTO.OrderTotal,
                    OrderDate = DateTime.Now,
                    StripePaymentIntentID = orderHeaderDTO.StripePaymentIntentID,
                    TotalItems = orderHeaderDTO.TotalItems,
                    Status = String.IsNullOrEmpty(orderHeaderDTO.Status) ? SD.status_pending : orderHeaderDTO.Status,
                };

                _logger.LogInformation("Attempting to save order to database");
                _db.OrderHeaders.Add(order);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Order header saved successfully");

                foreach (var orderDetailDTO in orderHeaderDTO.OrderDetailsDTO)
                {
                    OrderDetails orderDetails = new()
                    {
                        OrderHeaderId = order.OrderHeaderId,
                        ItemName = orderDetailDTO.ItemName,
                        MenuItemId = orderDetailDTO.MenuItemId,
                        Price = orderDetailDTO.Price,
                        Quantity = orderDetailDTO.Quantity,
                    };
                    _db.OrderDetails.Add(orderDetails);
                }

                _logger.LogInformation("Attempting to save order details");
                await _db.SaveChangesAsync();
                _logger.LogInformation("Order details saved successfully");

                _response.Result = order;
                order.OrderDetails = null;
                _response.StatusCode = HttpStatusCode.Created;
                return CreatedAtAction(nameof(GetOrders), new { id = order.OrderHeaderId }, _response);
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database error occurred while creating order");
                _response.IsSuccess = false;
                _response.ErrorMessages = new List<string> {
            "A database error occurred while creating the order.",
            $"Error details: {dbEx.Message}",
            $"Inner exception: {dbEx.InnerException?.Message}",
        };
                _response.StatusCode = HttpStatusCode.InternalServerError;
                return StatusCode((int)HttpStatusCode.InternalServerError, _response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while creating order");
                _response.IsSuccess = false;
                _response.ErrorMessages = new List<string> {
            "An error occurred while creating the order.",
            $"Error details: {ex.Message}",
        };
                _response.StatusCode = HttpStatusCode.InternalServerError;
                return StatusCode((int)HttpStatusCode.InternalServerError, _response);
            }
        }


        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse>> UpdateOrder(int id, [FromBody] OrderHeaderUpdateDTO orderUpdateDTO)
        {
            try
            {
                if (orderUpdateDTO == null || id != orderUpdateDTO.OrderHeaderId)
                {
                    _response.IsSuccess = false;
                    _response.StatusCode = HttpStatusCode.BadRequest;
                    _response.ErrorMessages = new List<string> { "Invalid input data" };
                    return BadRequest(_response);
                }

                var orderFromDb = await _db.OrderHeaders.FindAsync(id);

                if (orderFromDb == null)
                {
                    _response.IsSuccess = false;
                    _response.StatusCode = HttpStatusCode.NotFound;
                    _response.ErrorMessages = new List<string> { "Order not found" };
                    return NotFound(_response);
                }

                orderFromDb.PickupName = orderUpdateDTO.PickupName;
                orderFromDb.PickupPhoneNumber = orderUpdateDTO.PickupPhoneNumber;
                orderFromDb.PickupEmail = orderUpdateDTO.PickupEmail;
                orderFromDb.StripePaymentIntentID = orderUpdateDTO.StripePaymentIntentID;
                orderFromDb.Status = orderUpdateDTO.Status;

                await _db.SaveChangesAsync();
                _response.StatusCode = HttpStatusCode.OK;
                _response.IsSuccess = true;
                _response.Result = orderFromDb;
                return Ok(_response);
            }
            catch (Exception ex)
            {
                _response.IsSuccess = false;
                _response.ErrorMessages = new List<string> { ex.Message };
                _response.StatusCode = HttpStatusCode.InternalServerError;
                return StatusCode((int)HttpStatusCode.InternalServerError, _response);
            }
        }
    }
}