using backend.DTOs;

namespace backend.Services;

/// <summary>
/// Business logic for customer registration and vehicle management (staff/admin flows).
/// </summary>
public interface ICustomerService
{
    /// <summary>Creates a login user (customer role), customer profile, and returns the mapped DTO.</summary>
    Task<CustomerResponseDto> CreateCustomerAsync(CreateCustomerDto dto);

    /// <summary>Returns a single customer with vehicles, or null if not found.</summary>
    Task<CustomerResponseDto?> GetCustomerByIdAsync(int id);

    /// <summary>Returns all customers with vehicles.</summary>
    Task<List<CustomerResponseDto>> GetAllCustomersAsync();

    /// <summary>Adds a vehicle to the given customer.</summary>
    /// <exception cref="InvalidOperationException">When the customer does not exist.</exception>
    Task<VehicleResponseDto> AddVehicleAsync(int customerId, CreateVehicleDto dto);
}
