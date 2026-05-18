using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>
/// Feature 16: loyalty program reporting (10% discount when a single purchase pre-discount subtotal exceeds $5,000).
/// </summary>
[ApiController]
[Route("api/loyalty")]
public class LoyaltyController : ControllerBase
{
    /// <summary>Must match <see cref="Services.SalesInvoiceService"/> loyalty gate (exclusive of this value).</summary>
    private const decimal LoyaltyGrossThreshold = 5000m;

    private const int TopCustomerLimit = 15;

    private readonly ApplicationDbContext _db;

    public LoyaltyController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Aggregated loyalty usage across all customers and invoices with discounts.</summary>
    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(LoyaltyStatsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoyaltyStatsDto>> GetStats(CancellationToken cancellationToken)
    {
        var discounted = await _db.SalesInvoices.AsNoTracking()
            .Where(s => s.DiscountApplied > 0)
            .Include(s => s.Customer)
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.Id)
            .ToListAsync(cancellationToken);

        var totalDiscount = discounted.Sum(s => s.DiscountApplied);
        var totalCustomers = discounted.Select(s => s.CustomerId).Distinct().Count();

        var topCustomers = discounted
            .GroupBy(s => new { s.CustomerId, Name = s.Customer.FullName })
            .Select(g => new LoyaltyTopCustomerDto
            {
                CustomerId = g.Key.CustomerId,
                CustomerName = g.Key.Name,
                TotalDiscountReceived = g.Sum(x => x.DiscountApplied),
                DiscountedInvoiceCount = g.Count(),
            })
            .OrderByDescending(t => t.TotalDiscountReceived)
            .ThenByDescending(t => t.DiscountedInvoiceCount)
            .Take(TopCustomerLimit)
            .ToList();

        var invoiceRows = discounted.Select(s => new LoyaltyDiscountedInvoiceDto
        {
            InvoiceId = s.Id,
            CustomerId = s.CustomerId,
            CustomerName = s.Customer.FullName,
            SaleDate = s.SaleDate,
            GrossBeforeDiscount = s.TotalAmount,
            DiscountApplied = s.DiscountApplied,
            NetPaid = s.TotalAmount - s.DiscountApplied,
        }).ToList();

        return Ok(new LoyaltyStatsDto
        {
            TotalCustomers = totalCustomers,
            TotalDiscountGiven = totalDiscount,
            TopCustomers = topCustomers,
            DiscountedInvoices = invoiceRows,
        });
    }

    /// <summary>Loyalty summary for the authenticated customer.</summary>
    [HttpGet("my-benefits")]
    [Authorize(Roles = "Customer")]
    [ProducesResponseType(typeof(CustomerLoyaltyDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerLoyaltyDto>> GetMyBenefits(CancellationToken cancellationToken)
    {
        if (!TryResolveUserIdFromJwt(out var userId))
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (customer is null)
        {
            return NotFound("Customer profile not found.");
        }

        var invoices = await _db.SalesInvoices.AsNoTracking()
            .Where(s => s.CustomerId == customer.Id)
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.Id)
            .ToListAsync(cancellationToken);

        var totalPurchases = invoices.Count;
        var totalSpent = invoices.Sum(s => s.TotalAmount);
        var totalDiscountReceived = invoices.Sum(s => s.DiscountApplied);

        var last = invoices.FirstOrDefault();
        var lastGross = last?.TotalAmount ?? 0m;
        var qualifiesLast = lastGross > LoyaltyGrossThreshold;

        // Smallest increment above threshold (same rule as sales: strictly greater than $5,000).
        var minQualifyingGross = LoyaltyGrossThreshold + 0.01m;
        var amountNeeded = last is null
            ? minQualifyingGross
            : Math.Max(0m, decimal.Round(minQualifyingGross - lastGross, 2, MidpointRounding.AwayFromZero));

        var dto = new CustomerLoyaltyDto
        {
            TotalPurchases = totalPurchases,
            TotalSpent = totalSpent,
            TotalDiscountReceived = totalDiscountReceived,
            NextDiscountThreshold = LoyaltyGrossThreshold,
            AmountNeededForDiscount = amountNeeded,
            QualifiesForNextDiscount = qualifiesLast,
            LastOrderGrossBeforeDiscount = lastGross,
        };

        return Ok(dto);
    }

    /// <summary>Reads user id from JWT (<see cref="ClaimTypes.NameIdentifier"/> or <c>sub</c>).</summary>
    private bool TryResolveUserIdFromJwt(out int userId)
    {
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
}
