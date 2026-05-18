namespace backend.Models;

public class SalesInvoice
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int StaffId { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime SaleDate { get; set; } = DateTime.UtcNow;
    public decimal DiscountApplied { get; set; }
    public bool IsPaid { get; set; } = false;

    public Customer Customer { get; set; } = null!;
    public Staff Staff { get; set; } = null!;
    public ICollection<SalesInvoiceItem> Items { get; set; } = new List<SalesInvoiceItem>();
}
