namespace backend.Models;

public class PurchaseInvoice
{
    public int Id { get; set; }
    public int VendorId { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public int AdminId { get; set; }

    public Vendor Vendor { get; set; } = null!;
    public User Admin { get; set; } = null!;
    public ICollection<PurchaseInvoiceItem> Items { get; set; } = new List<PurchaseInvoiceItem>();
}
