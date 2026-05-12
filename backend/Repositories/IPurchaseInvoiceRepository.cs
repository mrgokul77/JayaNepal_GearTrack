using backend.Models;

namespace backend.Repositories;

/// <summary>Purchase invoice persistence (includes vendor and item navigation for reads).</summary>
public interface IPurchaseInvoiceRepository
{
    /// <summary>Persists a new invoice and its line items in one unit of work.</summary>
    Task<PurchaseInvoice> CreateAsync(PurchaseInvoice invoice);

    /// <summary>Loads an invoice by id with vendor, items, and part names.</summary>
    Task<PurchaseInvoice?> GetByIdAsync(int id);

    /// <summary>Lists all invoices with vendor and items.</summary>
    Task<List<PurchaseInvoice>> GetAllAsync();
}
