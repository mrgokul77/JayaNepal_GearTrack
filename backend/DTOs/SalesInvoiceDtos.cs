namespace backend.DTOs;

/// <summary>One sale line: catalog part and quantity (unit price comes from <see cref="Models.VehiclePart.Price"/>).</summary>
public class CreateSalesInvoiceItemDto
{
    public int PartId { get; set; }
    public int Quantity { get; set; }
}

/// <summary>Payload to create a sales invoice and deduct stock.</summary>
public class CreateSalesInvoiceDto
{
    public int CustomerId { get; set; }
    public List<CreateSalesInvoiceItemDto> Items { get; set; } = new();
}

/// <summary>Serialized sales line with computed subtotal.</summary>
public class SalesInvoiceItemResponseDto
{
    public int Id { get; set; }
    public int PartId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    /// <summary>Quantity × UnitPrice (before invoice-level loyalty discount).</summary>
    public decimal SubTotal { get; set; }
}

/// <summary>Sales invoice with customer, staff, lines, and loyalty discount.</summary>
public class SalesInvoiceResponseDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    /// <summary>Sum of line subtotals before loyalty discount.</summary>
    public decimal TotalAmount { get; set; }
    public decimal DiscountApplied { get; set; }
    public DateTime SaleDate { get; set; }
    public List<SalesInvoiceItemResponseDto> Items { get; set; } = new();
}
