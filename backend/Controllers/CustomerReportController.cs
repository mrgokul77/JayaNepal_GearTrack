using backend.Data;
using backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/customer-reports")]
[Authorize(Roles = "Admin,Staff")]
public class CustomerReportController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<CustomerReportController> _logger;

    public CustomerReportController(ApplicationDbContext db, ILogger<CustomerReportController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Customers with more than two sales (invoice count &gt; 2), ordered by purchase count.</summary>
    [HttpGet("regular-customers")]
    [ProducesResponseType(typeof(List<RegularCustomerDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<RegularCustomerDto>>> GetRegularCustomers()
    {
        try
        {
            var aggregates = await _db.SalesInvoices.AsNoTracking()
                .GroupBy(si => si.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key,
                    TotalPurchases = g.Count(),
                    TotalSpent = g.Sum(si => si.TotalAmount),
                })
                .Where(x => x.TotalPurchases > 2)
                .OrderByDescending(x => x.TotalPurchases)
                .ToListAsync();

            if (aggregates.Count == 0)
            {
                return Ok(new List<RegularCustomerDto>());
            }

            var customerIds = aggregates.Select(a => a.CustomerId).ToList();
            var customers = await _db.Customers.AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id);

            var result = aggregates
                .Select(a => customers.TryGetValue(a.CustomerId, out var c)
                    ? new RegularCustomerDto
                    {
                        CustomerId = c.Id,
                        FullName = c.FullName,
                        Email = c.Email,
                        Phone = c.Phone,
                        TotalPurchases = a.TotalPurchases,
                        TotalSpent = a.TotalSpent,
                    }
                    : null)
                .Where(x => x != null)
                .Cast<RegularCustomerDto>()
                .ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load regular customers report.");
            return Problem(
                detail: "Could not load regular customers. Try again later.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>Top 10 customers by sum of invoice totals, with most recent sale date.</summary>
    [HttpGet("high-spenders")]
    [ProducesResponseType(typeof(List<HighSpenderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<HighSpenderDto>>> GetHighSpenders()
    {
        try
        {
            var aggregates = await _db.SalesInvoices.AsNoTracking()
                .GroupBy(si => si.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key,
                    TotalSpent = g.Sum(si => si.TotalAmount),
                    LastPurchaseDate = g.Max(si => si.SaleDate),
                })
                .OrderByDescending(x => x.TotalSpent)
                .Take(10)
                .ToListAsync();

            if (aggregates.Count == 0)
            {
                return Ok(new List<HighSpenderDto>());
            }

            var customerIds = aggregates.Select(a => a.CustomerId).ToList();
            var customers = await _db.Customers.AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id);

            var result = aggregates
                .Select(a => customers.TryGetValue(a.CustomerId, out var c)
                    ? new HighSpenderDto
                    {
                        CustomerId = c.Id,
                        FullName = c.FullName,
                        Email = c.Email,
                        Phone = c.Phone,
                        TotalSpent = a.TotalSpent,
                        LastPurchaseDate = a.LastPurchaseDate,
                    }
                    : null)
                .Where(x => x != null)
                .Cast<HighSpenderDto>()
                .ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load high spenders report.");
            return Problem(
                detail: "Could not load high spenders. Try again later.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Customers with invoices matching credit follow-up rules (outstanding unpaid balance - DiscountApplied &gt; 0).
    /// TotalUnpaid is the sum of TotalAmount on those matching invoices.
    /// </summary>
    [HttpGet("pending-credits")]
    [ProducesResponseType(typeof(List<PendingCreditDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<List<PendingCreditDto>>> GetPendingCredits()
    {
        try
        {
            var aggregates = await _db.SalesInvoices.AsNoTracking()
                .Where(si => si.DiscountApplied > 0 && !si.IsPaid)
                .GroupBy(si => si.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key,
                    TotalUnpaid = g.Sum(si => si.TotalAmount),
                })
                .OrderByDescending(x => x.TotalUnpaid)
                .ToListAsync();

            if (aggregates.Count == 0)
            {
                return Ok(new List<PendingCreditDto>());
            }

            var customerIds = aggregates.Select(a => a.CustomerId).ToList();
            var customers = await _db.Customers.AsNoTracking()
                .Where(c => customerIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id);

            var result = aggregates
                .Select(a => customers.TryGetValue(a.CustomerId, out var c)
                    ? new PendingCreditDto
                    {
                        CustomerId = c.Id,
                        FullName = c.FullName,
                        Email = c.Email,
                        Phone = c.Phone,
                        TotalUnpaid = a.TotalUnpaid,
                    }
                    : null)
                .Where(x => x != null)
                .Cast<PendingCreditDto>()
                .ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load pending credits report.");
            return Problem(
                detail: "Could not load pending credits. Try again later.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }
}
