namespace backend.DTOs;

/// <summary>Aggregated sales, purchases, and top parts for a single calendar day (UTC boundaries).</summary>
public class DailyReportDto
{
    public DateOnly Date { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalPurchases { get; set; }
    public decimal Profit { get; set; }
    public decimal TotalDiscounts { get; set; }
    public int NumberOfSales { get; set; }
    public int NumberOfPurchases { get; set; }
    public List<TopSellingPartDto> TopParts { get; set; } = new();
}

/// <summary>Aggregated financials for a calendar month (UTC boundaries).</summary>
public class MonthlyReportDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalPurchases { get; set; }
    public decimal Profit { get; set; }
    public decimal TotalDiscounts { get; set; }
    public int NumberOfSales { get; set; }
    public int NumberOfPurchases { get; set; }
    public List<TopSellingPartDto> TopParts { get; set; } = new();
}

/// <summary>Year-level totals plus per-month breakdown (UTC boundaries).</summary>
public class YearlyReportDto
{
    public int Year { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalPurchases { get; set; }
    public decimal Profit { get; set; }
    public decimal TotalDiscounts { get; set; }
    public int NumberOfSales { get; set; }
    public int NumberOfPurchases { get; set; }
    public List<MonthlyBreakdownDto> MonthlyBreakdown { get; set; } = new();
}

/// <summary>Line item aggregated by part for top-sellers tables.</summary>
public class TopSellingPartDto
{
    public string PartName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

/// <summary>One month slice inside a yearly report.</summary>
public class MonthlyBreakdownDto
{
    public int Month { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalPurchases { get; set; }
    public decimal Profit { get; set; }
}
