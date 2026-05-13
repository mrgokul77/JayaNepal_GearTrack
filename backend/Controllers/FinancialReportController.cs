using backend.Data;
using backend.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>Admin-only financial summaries from sales and purchase invoices.</summary>
[ApiController]
[Route("api/financial-reports")]
[Authorize(Roles = "Admin")]
public class FinancialReportController : ControllerBase
{
    private const int TopPartsLimit = 10;

    private readonly ApplicationDbContext _db;
    private readonly ILogger<FinancialReportController> _logger;

    public FinancialReportController(ApplicationDbContext db, ILogger<FinancialReportController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Daily report: sales and purchases whose timestamps fall on the given UTC calendar date.</summary>
    [HttpGet("daily")]
    [ProducesResponseType(typeof(DailyReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<DailyReportDto>> GetDaily([FromQuery] string? date)
    {
        if (!TryParseDateOnly(date, out var day, out var dateError))
        {
            return BadRequest(new { error = dateError });
        }

        var (rangeStart, rangeEnd) = GetUtcDayRange(day);

        try
        {
            var dto = await BuildDailyReportAsync(day, rangeStart, rangeEnd);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build daily financial report for {Date}.", day);
            return Problem(
                detail: "Could not load the daily financial report. Try again later.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>Monthly report for the given calendar month (UTC).</summary>
    [HttpGet("monthly")]
    [ProducesResponseType(typeof(MonthlyReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<MonthlyReportDto>> GetMonthly([FromQuery] int month, [FromQuery] int year)
    {
        if (!IsValidMonthYear(month, year, out var rangeError))
        {
            return BadRequest(new { error = rangeError });
        }

        var (rangeStart, rangeEnd) = GetUtcMonthRange(year, month);

        try
        {
            var dto = await BuildMonthlyReportAsync(month, year, rangeStart, rangeEnd);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build monthly financial report for {Year}-{Month}.", year, month);
            return Problem(
                detail: "Could not load the monthly financial report. Try again later.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>Yearly report with per-month breakdown (UTC).</summary>
    [HttpGet("yearly")]
    [ProducesResponseType(typeof(YearlyReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<YearlyReportDto>> GetYearly([FromQuery] int year)
    {
        if (year < 1 || year > 9999)
        {
            return BadRequest(new { error = "Year must be between 1 and 9999." });
        }

        var (yearStart, yearEnd) = GetUtcYearRange(year);

        try
        {
            var dto = await BuildYearlyReportAsync(year, yearStart, yearEnd);
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build yearly financial report for {Year}.", year);
            return Problem(
                detail: "Could not load the yearly financial report. Try again later.",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private async Task<DailyReportDto> BuildDailyReportAsync(DateOnly day, DateTime rangeStart, DateTime rangeEnd)
    {
        var salesAgg = await AggregateSalesAsync(rangeStart, rangeEnd);
        var purchaseAgg = await AggregatePurchasesAsync(rangeStart, rangeEnd);
        var topParts = await GetTopSellingPartsAsync(rangeStart, rangeEnd);

        return new DailyReportDto
        {
            Date = day,
            TotalSales = salesAgg.TotalAmount,
            TotalPurchases = purchaseAgg.TotalAmount,
            Profit = salesAgg.TotalAmount - purchaseAgg.TotalAmount,
            TotalDiscounts = salesAgg.TotalDiscounts,
            NumberOfSales = salesAgg.Count,
            NumberOfPurchases = purchaseAgg.Count,
            TopParts = topParts,
        };
    }

    private async Task<MonthlyReportDto> BuildMonthlyReportAsync(int month, int year, DateTime rangeStart, DateTime rangeEnd)
    {
        var salesAgg = await AggregateSalesAsync(rangeStart, rangeEnd);
        var purchaseAgg = await AggregatePurchasesAsync(rangeStart, rangeEnd);
        var topParts = await GetTopSellingPartsAsync(rangeStart, rangeEnd);

        return new MonthlyReportDto
        {
            Month = month,
            Year = year,
            TotalSales = salesAgg.TotalAmount,
            TotalPurchases = purchaseAgg.TotalAmount,
            Profit = salesAgg.TotalAmount - purchaseAgg.TotalAmount,
            TotalDiscounts = salesAgg.TotalDiscounts,
            NumberOfSales = salesAgg.Count,
            NumberOfPurchases = purchaseAgg.Count,
            TopParts = topParts,
        };
    }

    private async Task<YearlyReportDto> BuildYearlyReportAsync(int year, DateTime yearStart, DateTime yearEnd)
    {
        var salesAgg = await AggregateSalesAsync(yearStart, yearEnd);
        var purchaseAgg = await AggregatePurchasesAsync(yearStart, yearEnd);

        var salesByMonth = await _db.SalesInvoices.AsNoTracking()
            .Where(si => si.SaleDate >= yearStart && si.SaleDate < yearEnd)
            .GroupBy(si => si.SaleDate.Month)
            .Select(g => new { Month = g.Key, Total = g.Sum(x => x.TotalAmount) })
            .ToDictionaryAsync(x => x.Month, x => x.Total);

        var purchasesByMonth = await _db.PurchaseInvoices.AsNoTracking()
            .Where(pi => pi.PurchaseDate >= yearStart && pi.PurchaseDate < yearEnd)
            .GroupBy(pi => pi.PurchaseDate.Month)
            .Select(g => new { Month = g.Key, Total = g.Sum(x => x.TotalAmount) })
            .ToDictionaryAsync(x => x.Month, x => x.Total);

        var breakdown = new List<MonthlyBreakdownDto>(12);
        for (var m = 1; m <= 12; m++)
        {
            var ts = salesByMonth.GetValueOrDefault(m, 0m);
            var tp = purchasesByMonth.GetValueOrDefault(m, 0m);
            breakdown.Add(new MonthlyBreakdownDto
            {
                Month = m,
                TotalSales = ts,
                TotalPurchases = tp,
                Profit = ts - tp,
            });
        }

        return new YearlyReportDto
        {
            Year = year,
            TotalSales = salesAgg.TotalAmount,
            TotalPurchases = purchaseAgg.TotalAmount,
            Profit = salesAgg.TotalAmount - purchaseAgg.TotalAmount,
            TotalDiscounts = salesAgg.TotalDiscounts,
            NumberOfSales = salesAgg.Count,
            NumberOfPurchases = purchaseAgg.Count,
            MonthlyBreakdown = breakdown,
        };
    }

    private async Task<(decimal TotalAmount, decimal TotalDiscounts, int Count)> AggregateSalesAsync(
        DateTime rangeStart,
        DateTime rangeEnd)
    {
        var q = _db.SalesInvoices.AsNoTracking()
            .Where(si => si.SaleDate >= rangeStart && si.SaleDate < rangeEnd);

        var totalAmount = await q.SumAsync(si => (decimal?)si.TotalAmount) ?? 0m;
        var totalDiscounts = await q.SumAsync(si => (decimal?)si.DiscountApplied) ?? 0m;
        var count = await q.CountAsync();
        return (totalAmount, totalDiscounts, count);
    }

    private async Task<(decimal TotalAmount, int Count)> AggregatePurchasesAsync(DateTime rangeStart, DateTime rangeEnd)
    {
        var q = _db.PurchaseInvoices.AsNoTracking()
            .Where(pi => pi.PurchaseDate >= rangeStart && pi.PurchaseDate < rangeEnd);

        var totalAmount = await q.SumAsync(pi => (decimal?)pi.TotalAmount) ?? 0m;
        var count = await q.CountAsync();
        return (totalAmount, count);
    }

    /// <summary>Top parts by quantity sold in the period, from line items on matching sales invoices.</summary>
    private async Task<List<TopSellingPartDto>> GetTopSellingPartsAsync(DateTime rangeStart, DateTime rangeEnd)
    {
        return await _db.SalesInvoiceItems.AsNoTracking()
            .Where(item => item.SalesInvoice.SaleDate >= rangeStart && item.SalesInvoice.SaleDate < rangeEnd)
            .GroupBy(item => item.Part.Name)
            .Select(g => new TopSellingPartDto
            {
                PartName = g.Key,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.UnitPrice * x.Quantity),
            })
            .OrderByDescending(x => x.QuantitySold)
            .ThenByDescending(x => x.TotalRevenue)
            .Take(TopPartsLimit)
            .ToListAsync();
    }

    private static (DateTime Start, DateTime End) GetUtcDayRange(DateOnly day)
    {
        var start = DateTime.SpecifyKind(day.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var end = start.AddDays(1);
        return (start, end);
    }

    private static (DateTime Start, DateTime End) GetUtcMonthRange(int year, int month)
    {
        var start = DateTime.SpecifyKind(new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc), DateTimeKind.Utc);
        var end = start.AddMonths(1);
        return (start, end);
    }

    private static (DateTime Start, DateTime End) GetUtcYearRange(int year)
    {
        var start = DateTime.SpecifyKind(new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc), DateTimeKind.Utc);
        var end = start.AddYears(1);
        return (start, end);
    }

    private static bool TryParseDateOnly(string? date, out DateOnly day, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(date))
        {
            day = DateOnly.FromDateTime(DateTime.UtcNow.Date);
            return true;
        }

        if (!DateOnly.TryParse(date, out day))
        {
            error = "Invalid date. Use ISO format, e.g. 2026-05-13.";
            return false;
        }

        return true;
    }

    private static bool IsValidMonthYear(int month, int year, out string? error)
    {
        error = null;
        if (year < 1 || year > 9999)
        {
            error = "Year must be between 1 and 9999.";
            return false;
        }

        if (month is < 1 or > 12)
        {
            error = "Month must be between 1 and 12.";
            return false;
        }

        return true;
    }
}
