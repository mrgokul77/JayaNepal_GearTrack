using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

/// <summary>Payload to create a vendor record (admin only).</summary>
public class CreateVendorDto
{
    /// <summary>Vendor display or business name.</summary>
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Primary contact phone.</summary>
    [Required(ErrorMessage = "Phone is required.")]
    [MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    /// <summary>Contact email.</summary>
    [Required(ErrorMessage = "Email is required.")]
    [MaxLength(150)]
    [EmailAddress(ErrorMessage = "Email must be a valid address.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Postal or business address.</summary>
    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;
}

/// <summary>Payload to update an existing vendor.</summary>
public class UpdateVendorDto
{
    /// <summary>Vendor display or business name.</summary>
    [Required(ErrorMessage = "Name is required.")]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Primary contact phone.</summary>
    [Required(ErrorMessage = "Phone is required.")]
    [MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    /// <summary>Contact email.</summary>
    [Required(ErrorMessage = "Email is required.")]
    [MaxLength(150)]
    [EmailAddress(ErrorMessage = "Email must be a valid address.")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Postal or business address.</summary>
    [MaxLength(300)]
    public string Address { get; set; } = string.Empty;
}

/// <summary>API representation of a vendor.</summary>
public class VendorResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
