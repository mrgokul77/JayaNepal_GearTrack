using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>
/// Customer endpoints for booking and managing service appointments.
/// </summary>
[ApiController]
[Route("api/appointments")]
[Authorize]
public class AppointmentController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AppointmentController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Creates a new appointment in <c>Pending</c> status.</summary>
    [HttpPost]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(AppointmentResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AppointmentResponseDto>> Create([FromBody] CreateAppointmentDto dto)
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        if (string.IsNullOrWhiteSpace(dto.ServiceType))
        {
            return BadRequest("Service type is required.");
        }

        var appointment = new Appointment
        {
            CustomerId = resolved.CustomerId,
            AppointmentDate = dto.AppointmentDate.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(dto.AppointmentDate, DateTimeKind.Utc)
                : dto.AppointmentDate.ToUniversalTime(),
            ServiceType = dto.ServiceType.Trim(),
            Status = "Pending",
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, Map(appointment));
    }

    /// <summary>Returns the signed-in customer's appointments, newest first.</summary>
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(List<AppointmentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<AppointmentResponseDto>>> GetMine()
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        var rows = await _db.Appointments.AsNoTracking()
            .Where(a => a.CustomerId == resolved.CustomerId)
            .OrderByDescending(a => a.AppointmentDate)
            .ToListAsync();

        return Ok(rows.Select(Map).ToList());
    }

    /// <summary>Cancels a <c>Pending</c> appointment by setting status to <c>Cancelled</c>.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(int id)
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        var appointment = await _db.Appointments.FirstOrDefaultAsync(a =>
            a.Id == id && a.CustomerId == resolved.CustomerId);

        if (appointment is null)
        {
            return NotFound("Appointment not found.");
        }

        if (!string.Equals(appointment.Status, "Pending", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Only pending appointments can be cancelled.");
        }

        appointment.Status = "Cancelled";
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>Returns all customer appointments (Admin and Staff only), newest first.</summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(List<AppointmentResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<AppointmentResponseDto>>> GetAll()
    {
        var rows = await _db.Appointments.AsNoTracking()
            .Include(a => a.Customer)
            .OrderByDescending(a => a.AppointmentDate)
            .ThenByDescending(a => a.Id)
            .ToListAsync();

        return Ok(rows.Select(Map).ToList());
    }

    private async Task<(ActionResult? Error, int CustomerId)> ResolveCustomerAsync()
    {
        if (!TryResolveUserId(out var userId))
        {
            return (Unauthorized("Missing or invalid user id in token."), 0);
        }

        var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.UserId == userId);
        if (customer is null)
        {
            return (NotFound("Customer profile not found."), 0);
        }

        return (null, customer.Id);
    }

    /// <summary>Reads user id from JWT (<c>sub</c> / name identifier) for customer-scoped operations.</summary>
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

    private static AppointmentResponseDto Map(Appointment a) =>
        new()
        {
            Id = a.Id,
            CustomerId = a.CustomerId,
            CustomerName = a.Customer?.FullName,
            AppointmentDate = a.AppointmentDate,
            ServiceType = a.ServiceType,
            Status = a.Status,
            Notes = a.Notes,
            CreatedAt = a.CreatedAt,
        };
}
