namespace backend.DTOs;

/// <summary>
/// Data transfer objects for Feature 14: customers viewing their own sales and service history.
/// </summary>
public class PurchaseHistoryItemDto
{
    public int Id { get; set; }
    public DateTime SaleDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountApplied { get; set; }
    /// <summary>Amount after discount (total minus discount applied).</summary>
    public decimal FinalAmount { get; set; }
    public List<PurchaseLineDto> Items { get; set; } = new();
}

public class PurchaseLineDto
{
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
}

public class ServiceHistoryDto
{
    public int Id { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
