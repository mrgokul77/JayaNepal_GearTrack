using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

/// <inheritdoc cref="ISalesInvoiceRepository" />
public class SalesInvoiceRepository : ISalesInvoiceRepository
{
    private readonly ApplicationDbContext _dbContext;

    public SalesInvoiceRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<SalesInvoice> CreateAsync(SalesInvoice invoice)
    {
        _dbContext.SalesInvoices.Add(invoice);
        await _dbContext.SaveChangesAsync();
        return invoice;
    }

    /// <inheritdoc />
    public async Task<SalesInvoice?> GetByIdAsync(int id)
    {
        return await _dbContext.SalesInvoices
            .AsNoTracking()
            .Include(s => s.Customer)
            .Include(s => s.Staff)
            .Include(s => s.Items)
            .ThenInclude(i => i.Part)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    /// <inheritdoc />
    public async Task<List<SalesInvoice>> GetAllAsync()
    {
        return await _dbContext.SalesInvoices
            .AsNoTracking()
            .Include(s => s.Customer)
            .Include(s => s.Staff)
            .Include(s => s.Items)
            .ThenInclude(i => i.Part)
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.Id)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<List<SalesInvoice>> GetByCustomerIdAsync(int customerId)
    {
        return await _dbContext.SalesInvoices
            .AsNoTracking()
            .Include(s => s.Customer)
            .Include(s => s.Staff)
            .Include(s => s.Items)
            .ThenInclude(i => i.Part)
            .Where(s => s.CustomerId == customerId)
            .OrderByDescending(s => s.SaleDate)
            .ThenByDescending(s => s.Id)
            .ToListAsync();
    }
}
