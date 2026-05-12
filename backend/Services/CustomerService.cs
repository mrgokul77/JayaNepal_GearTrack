using System.Security.Cryptography;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Implements customer onboarding for staff/admin: creates linked <see cref="User"/> and <see cref="Customer"/>,
/// maps entities to DTOs, and manages vehicles via EF Core.
/// </summary>
public class CustomerService : ICustomerService
{
    private const int MinVehicleYear = 1900;
    private const int MaxSearchQueryLength = 200;
    private readonly ICustomerRepository _customerRepository;
    private readonly ApplicationDbContext _dbContext;
    private readonly IPasswordHasher<User> _passwordHasher;

    public CustomerService(
        ICustomerRepository customerRepository,
        ApplicationDbContext dbContext,
        IPasswordHasher<User> passwordHasher)
    {
        _customerRepository = customerRepository;
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    /// <inheritdoc />
    public async Task<CustomerResponseDto> CreateCustomerAsync(CreateCustomerDto dto)
    {
        ValidateCreateCustomer(dto);

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        if (await _customerRepository.GetByEmailAsync(normalizedEmail) is not null)
        {
            throw new InvalidOperationException("A customer with this email already exists.");
        }

        var initialPassword = GenerateInitialPassword();
        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = normalizedEmail,
            Role = "Customer",
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, initialPassword);

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var customer = new Customer
        {
            FullName = dto.FullName.Trim(),
            Email = normalizedEmail,
            Phone = dto.Phone.Trim(),
            Address = dto.Address?.Trim() ?? string.Empty,
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _customerRepository.CreateAsync(customer);
        // Initial password is not stored in clear text; expose once for staff to pass to the customer (demo / onboarding).
        var response = MapToResponse(created);
        response.InitialPassword = initialPassword;
        return response;
    }

    /// <inheritdoc />
    public async Task<CustomerResponseDto?> GetCustomerByIdAsync(int id)
    {
        var entity = await _customerRepository.GetByIdAsync(id);
        return entity is null ? null : MapToResponse(entity);
    }

    /// <inheritdoc />
    public async Task<List<CustomerResponseDto>> GetAllCustomersAsync()
    {
        var list = await _customerRepository.GetAllAsync();
        return list.Select(MapToResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<List<CustomerResponseDto>> SearchCustomersAsync(string query)
    {
        if (query is null)
        {
            throw new ArgumentNullException(nameof(query));
        }

        var trimmed = query.Trim();
        if (trimmed.Length == 0)
        {
            return new List<CustomerResponseDto>();
        }

        if (trimmed.Length > MaxSearchQueryLength)
        {
            throw new ArgumentException($"Search query must be at most {MaxSearchQueryLength} characters.", nameof(query));
        }

        var entities = await _customerRepository.SearchAsync(trimmed);
        return entities.Select(MapToResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<VehicleResponseDto> AddVehicleAsync(int customerId, CreateVehicleDto dto)
    {
        ValidateCreateVehicle(dto);

        var exists = await _dbContext.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists)
        {
            throw new InvalidOperationException("Customer not found.");
        }

        var vehicle = new Vehicle
        {
            CustomerId = customerId,
            VehicleNumber = dto.VehicleNumber.Trim(),
            Brand = dto.Brand.Trim(),
            Model = dto.Model.Trim(),
            Year = dto.Year
        };

        _dbContext.Vehicles.Add(vehicle);
        await _dbContext.SaveChangesAsync();

        return MapVehicle(vehicle);
    }

    private static void ValidateCreateCustomer(CreateCustomerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
        {
            throw new ArgumentException("Full name is required.", nameof(dto));
        }

        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new ArgumentException("Email is required.", nameof(dto));
        }

        if (string.IsNullOrWhiteSpace(dto.Phone))
        {
            throw new ArgumentException("Phone is required.", nameof(dto));
        }

        if (dto.FullName.Length > 150)
        {
            throw new ArgumentException("Full name must be at most 150 characters.", nameof(dto));
        }

        if (dto.Email.Length > 150)
        {
            throw new ArgumentException("Email must be at most 150 characters.", nameof(dto));
        }

        if (dto.Phone.Length > 30)
        {
            throw new ArgumentException("Phone must be at most 30 characters.", nameof(dto));
        }

        if ((dto.Address?.Length ?? 0) > 300)
        {
            throw new ArgumentException("Address must be at most 300 characters.", nameof(dto));
        }
    }

    private static void ValidateCreateVehicle(CreateVehicleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VehicleNumber))
        {
            throw new ArgumentException("Vehicle number is required.", nameof(dto));
        }

        if (string.IsNullOrWhiteSpace(dto.Brand))
        {
            throw new ArgumentException("Brand is required.", nameof(dto));
        }

        if (string.IsNullOrWhiteSpace(dto.Model))
        {
            throw new ArgumentException("Model is required.", nameof(dto));
        }

        if (dto.VehicleNumber.Length > 50)
        {
            throw new ArgumentException("Vehicle number must be at most 50 characters.", nameof(dto));
        }

        if (dto.Brand.Length > 100 || dto.Model.Length > 100)
        {
            throw new ArgumentException("Brand and model must be at most 100 characters.", nameof(dto));
        }

        var maxYear = DateTime.UtcNow.Year + 1;
        if (dto.Year < MinVehicleYear || dto.Year > maxYear)
        {
            throw new ArgumentException($"Year must be between {MinVehicleYear} and {maxYear}.", nameof(dto));
        }
    }

    private static string GenerateInitialPassword()
    {
        var bytes = RandomNumberGenerator.GetBytes(9);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', 'A').Replace('/', 'Z') + "a1!";
    }

    private static CustomerResponseDto MapToResponse(Customer c)
    {
        return new CustomerResponseDto
        {
            Id = c.Id,
            FullName = c.FullName,
            Email = c.Email,
            Phone = c.Phone,
            Address = c.Address,
            CreatedAt = c.CreatedAt,
            Vehicles = (c.Vehicles ?? Array.Empty<Vehicle>()).OrderBy(v => v.VehicleNumber).Select(MapVehicle).ToList()
        };
    }

    private static VehicleResponseDto MapVehicle(Vehicle v)
    {
        return new VehicleResponseDto
        {
            Id = v.Id,
            VehicleNumber = v.VehicleNumber,
            Brand = v.Brand,
            Model = v.Model,
            Year = v.Year
        };
    }
}
