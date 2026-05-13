namespace backend.DTOs;

/// <summary>Customers with repeat purchase activity (more than two sales invoices).</summary>
public class RegularCustomerDto
{
    public int CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int TotalPurchases { get; set; }
    public decimal TotalSpent { get; set; }
}

/// <summary>Top customers ranked by lifetime sales total.</summary>
public class HighSpenderDto
{
    public int CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public decimal TotalSpent { get; set; }
    public DateTime? LastPurchaseDate { get; set; }
}

/// <summary>
/// Customers with invoices flagged for credit / balance follow-up.
/// Uses sales invoice rows where DiscountApplied &gt; 0 (credit flag) or TotalAmount &gt; 0 per product spec.
/// </summary>
public class PendingCreditDto
{
    public int CustomerId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public decimal TotalUnpaid { get; set; }
}
