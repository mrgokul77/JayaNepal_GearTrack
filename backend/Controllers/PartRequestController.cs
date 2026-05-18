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
/// Customer endpoints for requesting unavailable or special-order parts.
/// </summary>
[ApiController]
[Route("api/part-requests")]
[Authorize]
public class PartRequestController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PartRequestController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Submits a part request in <c>Pending</c> status.</summary>
    [HttpPost]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(PartRequestResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PartRequestResponseDto>> Create([FromBody] CreatePartRequestDto dto)
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        if (string.IsNullOrWhiteSpace(dto.PartName))
        {
            return BadRequest("Part name is required.");
        }

        var entity = new PartRequest
        {
            CustomerId = resolved.CustomerId,
            PartName = dto.PartName.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };

        _db.PartRequests.Add(entity);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, Map(entity));
    }

    /// <summary>Returns the signed-in customer's part requests, newest first.</summary>
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(List<PartRequestResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<PartRequestResponseDto>>> GetMine()
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        var rows = await _db.PartRequests.AsNoTracking()
            .Where(p => p.CustomerId == resolved.CustomerId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(rows.Select(Map).ToList());
    }

    /// <summary>Returns all customer part requests (Admin and Staff only), newest first.</summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(List<PartRequestResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<PartRequestResponseDto>>> GetAll()
    {
        var rows = await _db.PartRequests.AsNoTracking()
            .Include(p => p.Customer)
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
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

    private static PartRequestResponseDto Map(PartRequest p) =>
        new()
        {
            Id = p.Id,
            CustomerId = p.CustomerId,
            CustomerName = p.Customer?.FullName,
            PartName = p.PartName,
            Description = p.Description,
            Status = p.Status,
            CreatedAt = p.CreatedAt,
        };
}
