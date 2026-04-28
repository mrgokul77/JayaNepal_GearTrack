namespace backend.Models;

public class SalesInvoiceItem
{
    public int Id { get; set; }
    public int SalesInvoiceId { get; set; }
    public int PartId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public SalesInvoice SalesInvoice { get; set; } = null!;
    public VehiclePart Part { get; set; } = null!;
}
