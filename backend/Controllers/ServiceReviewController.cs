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
/// Customer service reviews; staff/admin can list all reviews for quality monitoring.
/// </summary>
[ApiController]
[Route("api/service-reviews")]
[Authorize]
public class ServiceReviewController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ServiceReviewController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Submits a review with rating 1–5.</summary>
    [HttpPost]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(ServiceReviewResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ServiceReviewResponseDto>> Create([FromBody] CreateServiceReviewDto dto)
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        if (dto.Rating is < 1 or > 5)
        {
            return BadRequest("Rating must be between 1 and 5.");
        }

        var entity = new ServiceReview
        {
            CustomerId = resolved.CustomerId,
            Rating = dto.Rating,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        _db.ServiceReviews.Add(entity);
        await _db.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, Map(entity));
    }

    /// <summary>Returns reviews submitted by the signed-in customer.</summary>
    [HttpGet]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(List<ServiceReviewResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ServiceReviewResponseDto>>> GetMine()
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        var rows = await _db.ServiceReviews.AsNoTracking()
            .Include(s => s.Customer)
            .Where(s => s.CustomerId == resolved.CustomerId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(rows.Select(Map).ToList());
    }

    /// <summary>Returns every customer review (Admin and Staff only).</summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(List<ServiceReviewResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<ServiceReviewResponseDto>>> GetAll()
    {
        var rows = await _db.ServiceReviews.AsNoTracking()
            .Include(s => s.Customer)
            .OrderByDescending(s => s.CreatedAt)
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

    private static ServiceReviewResponseDto Map(ServiceReview s) =>
        new()
        {
            Id = s.Id,
            CustomerId = s.CustomerId,
            CustomerName = s.Customer?.FullName,
            Rating = s.Rating,
            Comment = s.Comment,
            CreatedAt = s.CreatedAt,
        };
}
