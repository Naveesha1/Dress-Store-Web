using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Udemy_Project.Models
{
    public class MenuItem
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public String Name { get; set; }
        public string Description { get; set; }
        public string SpecialTag { get; set; }
        public string Category { get; set; }
        [Range(1, int.MaxValue)]
        public double Price { get; set; }
        [Required]
        public string Image { get; set; }

        [NotMapped]
        public string ImageSrc { get; set; }
        
    }
}
