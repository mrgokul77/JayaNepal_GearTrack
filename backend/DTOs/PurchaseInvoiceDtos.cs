namespace backend.DTOs;

/// <summary>One line on a purchase invoice (catalog part id, quantity, negotiated unit price).</summary>
public class CreatePurchaseInvoiceItemDto
{
    /// <summary>Vehicle catalog part id (<see cref="Models.VehiclePart"/>).</summary>
    public int PartId { get; set; }

    /// <summary>Units purchased (must be positive).</summary>
    public int Quantity { get; set; }

    /// <summary>Cost per unit for this purchase line.</summary>
    public decimal UnitPrice { get; set; }
}

/// <summary>Payload to create a purchase invoice and increase on-hand stock.</summary>
public class CreatePurchaseInvoiceDto
{
    /// <summary>Supplier for this purchase.</summary>
    public int VendorId { get; set; }

    /// <summary>Line items; each part must belong to the same vendor.</summary>
    public List<CreatePurchaseInvoiceItemDto> Items { get; set; } = new();
}

/// <summary>Serialized purchase line returned from the API.</summary>
public class PurchaseInvoiceItemResponseDto
{
    public int Id { get; set; }
    public int PartId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

/// <summary>Purchase invoice with vendor and line details.</summary>
public class PurchaseInvoiceResponseDto
{
    public int Id { get; set; }
    public int VendorId { get; set; }
    public string VendorName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime PurchaseDate { get; set; }
    public int AdminId { get; set; }
    public List<PurchaseInvoiceItemResponseDto> Items { get; set; } = new();
}
