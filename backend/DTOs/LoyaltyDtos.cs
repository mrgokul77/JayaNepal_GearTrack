namespace backend.DTOs;

/// <summary>Admin dashboard: GearTrack loyalty (10% off single purchases over $5,000 pre-discount).</summary>
public class LoyaltyStatsDto
{
    /// <summary>Distinct customers with at least one loyalty-discounted invoice.</summary>
    public int TotalCustomers { get; set; }

    /// <summary>Sum of <c>DiscountApplied</c> across all sales invoices.</summary>
    public decimal TotalDiscountGiven { get; set; }

    public List<LoyaltyTopCustomerDto> TopCustomers { get; set; } = new();

    /// <summary>All invoices where a loyalty discount was applied.</summary>
    public List<LoyaltyDiscountedInvoiceDto> DiscountedInvoices { get; set; } = new();
}

public class LoyaltyTopCustomerDto
{
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalDiscountReceived { get; set; }
    public int DiscountedInvoiceCount { get; set; }
}

public class LoyaltyDiscountedInvoiceDto
{
    public int InvoiceId { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public DateTime SaleDate { get; set; }
    /// <summary>Pre-loyalty subtotal stored as invoice <c>TotalAmount</c>.</summary>
    public decimal GrossBeforeDiscount { get; set; }
    public decimal DiscountApplied { get; set; }
    public decimal NetPaid { get; set; }
}

/// <summary>Signed-in customer loyalty summary (aligned with single-purchase &gt; $5,000 rule).</summary>
public class CustomerLoyaltyDto
{
    public int TotalPurchases { get; set; }
    /// <summary>Sum of pre-discount invoice subtotals (<c>TotalAmount</c>).</summary>
    public decimal TotalSpent { get; set; }
    public decimal TotalDiscountReceived { get; set; }
    /// <summary>Pre-discount subtotal required for 10% loyalty (exclusive lower bound in business rules).</summary>
    public decimal NextDiscountThreshold { get; set; }
    /// <summary>
    /// Additional pre-discount subtotal needed on a <strong>single purchase matching your last order size</strong> to exceed the threshold
    /// (0 when your last invoice already qualified, or you have no purchases yet).
    /// </summary>
    public decimal AmountNeededForDiscount { get; set; }
    /// <summary>True when your most recent invoice pre-discount subtotal was above the loyalty threshold.</summary>
    public bool QualifiesForNextDiscount { get; set; }
    /// <summary>Pre-discount subtotal of the most recent invoice (0 if none).</summary>
    public decimal LastOrderGrossBeforeDiscount { get; set; }
}
