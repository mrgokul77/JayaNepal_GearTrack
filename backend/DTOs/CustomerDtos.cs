namespace backend.DTOs;

/// <summary>
/// Payload for staff or admin to register a new customer account and profile.
/// </summary>
public class CreateCustomerDto
{
    /// <summary>Customer display name.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Login email; stored normalized (lowercase).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Primary contact phone.</summary>
    public string Phone { get; set; } = string.Empty;

    /// <summary>Postal or service address (optional text).</summary>
    public string Address { get; set; } = string.Empty;
}

/// <summary>
/// Payload to attach a vehicle to an existing customer.
/// </summary>
public class CreateVehicleDto
{
    /// <summary>License plate or internal fleet number.</summary>
    public string VehicleNumber { get; set; } = string.Empty;

    /// <summary>Vehicle manufacturer.</summary>
    public string Brand { get; set; } = string.Empty;

    /// <summary>Vehicle model name.</summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>Model year.</summary>
    public int Year { get; set; }
}

/// <summary>
/// API representation of a vehicle.
/// </summary>
public class VehicleResponseDto
{
    /// <summary>Database identifier.</summary>
    public int Id { get; set; }

    /// <summary>License plate or internal fleet number.</summary>
    public string VehicleNumber { get; set; } = string.Empty;

    /// <summary>Vehicle manufacturer.</summary>
    public string Brand { get; set; } = string.Empty;

    /// <summary>Vehicle model name.</summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>Model year.</summary>
    public int Year { get; set; }
}

/// <summary>
/// API representation of a customer and their vehicles.
/// </summary>
public class CustomerResponseDto
{
    /// <summary>Customer profile identifier.</summary>
    public int Id { get; set; }

    /// <summary>Customer display name.</summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>Contact email.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Primary phone.</summary>
    public string Phone { get; set; } = string.Empty;

    /// <summary>Address on file.</summary>
    public string Address { get; set; } = string.Empty;

    /// <summary>When the profile was created (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Vehicles linked to this customer.</summary>
    public List<VehicleResponseDto> Vehicles { get; set; } = new();

    /// <summary>
    /// Populated only when a customer account is first created by staff/admin via <c>POST /api/customers</c>.
    /// One-time initial login password for the new user account.
    /// </summary>
    public string? InitialPassword { get; set; }
}
