namespace backend.DTOs;

public class CustomerDetailDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<VehicleDto> Vehicles { get; set; } = new();
    public List<PurchaseHistoryDto> PurchaseHistory { get; set; } = new();
}

public class VehicleDto
{
    public int Id { get; set; }
    public string VehicleNumber { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
}

public class PurchaseHistoryDto
{
    public int Id { get; set; }
    public DateTime SaleDate { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DiscountApplied { get; set; }
    public List<PurchaseItemDto> Items { get; set; } = new();
}

public class PurchaseItemDto
{
    public string PartName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal SubTotal { get; set; }
}
