using Microsoft.AspNetCore.Identity;

namespace Udemy_Project.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string Name {  get; set; } 

    }
}
