using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/customer-profile")]
[Authorize(Roles = "Customer")]
public class CustomerProfileController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public CustomerProfileController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(CustomerProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerProfileResponseDto>> GetProfile()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim))
        {
            userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }

        if (string.IsNullOrWhiteSpace(userIdClaim))
        {
            return Unauthorized();
        }

        var userId = int.Parse(userIdClaim.Trim(), System.Globalization.CultureInfo.InvariantCulture);
        Console.WriteLine($"UserId from JWT: {userId}");

        var customer = await _db.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (customer is null)
        {
            return NotFound("Customer profile not found");
        }

        return Ok(MapProfile(customer));
    }

    [HttpPut]
    [ProducesResponseType(typeof(CustomerProfileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerProfileResponseDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        if (!TryResolveUserId(out var userId))
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        if (string.IsNullOrWhiteSpace(dto.FullName))
        {
            return BadRequest("Full name is required.");
        }

        var customer = await _db.Customers
            .Include(c => c.User)
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (customer is null)
        {
            return NotFound("Profile not found.");
        }

        var fullName = dto.FullName.Trim();
        customer.FullName = fullName;
        customer.Phone = dto.Phone?.Trim() ?? string.Empty;
        customer.Address = dto.Address?.Trim() ?? string.Empty;
        customer.User.FullName = fullName;

        await _db.SaveChangesAsync();

        return Ok(MapProfile(customer));
    }

    [HttpGet("vehicles")]
    [ProducesResponseType(typeof(List<VehicleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<VehicleDto>>> GetVehicles()
    {
        if (!TryResolveUserId(out var userId))
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var customer = await _db.Customers.AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (customer is null)
        {
            return NotFound("Profile not found.");
        }

        return Ok(customer.Vehicles.OrderBy(v => v.VehicleNumber).Select(MapVehicle).ToList());
    }

    [HttpPost("vehicles")]
    [ProducesResponseType(typeof(VehicleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleDto>> AddVehicle([FromBody] AddCustomerVehicleDto dto)
    {
        if (!TryResolveUserId(out var userId))
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        if (string.IsNullOrWhiteSpace(dto.VehicleNumber) || string.IsNullOrWhiteSpace(dto.Brand) ||
            string.IsNullOrWhiteSpace(dto.Model))
        {
            return BadRequest("Vehicle number, brand, and model are required.");
        }

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.UserId == userId);
        if (customer is null)
        {
            return NotFound("Profile not found.");
        }

        var vehicle = new Vehicle
        {
            CustomerId = customer.Id,
            VehicleNumber = dto.VehicleNumber.Trim(),
            Brand = dto.Brand.Trim(),
            Model = dto.Model.Trim(),
            Year = dto.Year,
        };

        _db.Vehicles.Add(vehicle);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, MapVehicle(vehicle));
    }

    [HttpPut("vehicles/{id:int}")]
    [ProducesResponseType(typeof(VehicleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleDto>> UpdateVehicle(int id, [FromBody] UpdateCustomerVehicleDto dto)
    {
        if (!TryResolveUserId(out var userId))
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        if (string.IsNullOrWhiteSpace(dto.VehicleNumber) || string.IsNullOrWhiteSpace(dto.Brand) ||
            string.IsNullOrWhiteSpace(dto.Model))
        {
            return BadRequest("Vehicle number, brand, and model are required.");
        }

        var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.UserId == userId);
        if (customer is null)
        {
            return NotFound("Profile not found.");
        }

        var vehicle = await _db.Vehicles.FirstOrDefaultAsync(v => v.Id == id && v.CustomerId == customer.Id);
        if (vehicle is null)
        {
            return NotFound();
        }

        vehicle.VehicleNumber = dto.VehicleNumber.Trim();
        vehicle.Brand = dto.Brand.Trim();
        vehicle.Model = dto.Model.Trim();
        vehicle.Year = dto.Year;

        await _db.SaveChangesAsync();

        return Ok(MapVehicle(vehicle));
    }

    /// <summary>
    /// Resolves the application user id from the JWT. Checks multiple claim types because inbound JWT claim mapping
    /// can vary by host framework version (<c>sub</c> vs <see cref="ClaimTypes.NameIdentifier"/>).
    /// </summary>
    private bool TryResolveUserId(out int userId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim))
        {
            userIdClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }

        userId = 0;
        if (string.IsNullOrWhiteSpace(userIdClaim))
        {
            return false;
        }

        return int.TryParse(userIdClaim.Trim(), out userId) && userId > 0;
    }

    private static CustomerProfileResponseDto MapProfile(Customer customer)
    {
        return new CustomerProfileResponseDto
        {
            Id = customer.Id,
            FullName = customer.FullName,
            Email = customer.Email,
            Phone = customer.Phone,
            Address = customer.Address,
            CreatedAt = customer.CreatedAt,
            Vehicles = (customer.Vehicles ?? Enumerable.Empty<Vehicle>()).OrderBy(v => v.VehicleNumber).Select(MapVehicle).ToList(),
        };
    }

    private static VehicleDto MapVehicle(Vehicle v)
    {
        return new VehicleDto
        {
            Id = v.Id,
            VehicleNumber = v.VehicleNumber,
            Brand = v.Brand,
            Model = v.Model,
            Year = v.Year,
        };
    }
}
