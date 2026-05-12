using backend.Models;

namespace backend.Repositories;

/// <summary>Persistence for sales invoices (customer vehicle parts sales).</summary>
public interface ISalesInvoiceRepository
{
    Task<SalesInvoice> CreateAsync(SalesInvoice invoice);
    Task<SalesInvoice?> GetByIdAsync(int id);
    Task<List<SalesInvoice>> GetAllAsync();
    Task<List<SalesInvoice>> GetByCustomerIdAsync(int customerId);
}
