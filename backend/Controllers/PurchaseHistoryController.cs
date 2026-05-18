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
/// Customer-scoped purchase (sales invoice) and service appointment history.
/// </summary>
[ApiController]
[Route("api/purchase-history")]
[Authorize(Roles = "Customer")]
public class PurchaseHistoryController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PurchaseHistoryController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Returns the signed-in customer's sales invoices, newest first, with line items.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseHistoryItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<PurchaseHistoryItemDto>>> GetPurchaseHistory()
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        var invoices = await _db.SalesInvoices.AsNoTracking()
            .Where(s => s.CustomerId == resolved.CustomerId)
            .Include(s => s.Items)
            .ThenInclude(i => i.Part)
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.Id)
            .ToListAsync();

        var list = invoices.Select(MapPurchaseHistoryItem).ToList();
        return Ok(list);
    }

    /// <summary>Returns the signed-in customer's appointments, newest by appointment date.</summary>
    [HttpGet("services")]
    [ProducesResponseType(typeof(List<ServiceHistoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<ServiceHistoryDto>>> GetServiceHistory()
    {
        var resolved = await ResolveCustomerAsync();
        if (resolved.Error is not null)
        {
            return resolved.Error;
        }

        var rows = await _db.Appointments.AsNoTracking()
            .Where(a => a.CustomerId == resolved.CustomerId)
            .OrderByDescending(a => a.AppointmentDate)
            .ThenByDescending(a => a.Id)
            .Select(a => new ServiceHistoryDto
            {
                Id = a.Id,
                AppointmentDate = a.AppointmentDate,
                ServiceType = a.ServiceType,
                Status = a.Status,
                Notes = a.Notes,
            })
            .ToListAsync();

        return Ok(rows);
    }

    /// <summary>Loads the customer row linked to the authenticated user.</summary>
    private async Task<(ActionResult? Error, int CustomerId)> ResolveCustomerAsync()
    {
        if (!TryResolveUserIdFromJwt(out var userId))
        {
            return (Unauthorized("Missing or invalid user id in token."), 0);
        }

        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (customer is null)
        {
            return (NotFound("Customer profile not found."), 0);
        }

        return (null, customer.Id);
    }

    /// <summary>
    /// Reads user id from JWT. Prefer <see cref="ClaimTypes.NameIdentifier"/>; fall back to <c>sub</c>
    /// because <see cref="AuthController"/> issues <see cref="JwtRegisteredClaimNames.Sub"/> with the user id.
    /// </summary>
    private bool TryResolveUserIdFromJwt(out int userId)
    {
        // Spec alignment: NameIdentifier is the standard claim for the authenticated user's id when mapped from JWT.
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
            ?? User.FindFirst("sub")?.Value;

        userId = 0;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        return int.TryParse(raw.Trim(), out userId) && userId > 0;
    }

    private static PurchaseHistoryItemDto MapPurchaseHistoryItem(SalesInvoice si)
    {
        var final = si.TotalAmount - si.DiscountApplied;
        return new PurchaseHistoryItemDto
        {
            Id = si.Id,
            SaleDate = si.SaleDate,
            TotalAmount = si.TotalAmount,
            DiscountApplied = si.DiscountApplied,
            FinalAmount = final,
            Items = si.Items
                .OrderBy(i => i.Id)
                .Select(i =>
                {
                    var sub = i.Quantity * i.UnitPrice;
                    return new PurchaseLineDto
                    {
                        PartName = i.Part?.Name ?? string.Empty,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        SubTotal = sub,
                    };
                })
                .ToList(),
        };
    }
}
