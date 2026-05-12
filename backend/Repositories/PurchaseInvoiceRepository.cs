using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

/// <inheritdoc cref="IPurchaseInvoiceRepository" />
public class PurchaseInvoiceRepository : IPurchaseInvoiceRepository
{
    private readonly ApplicationDbContext _dbContext;

    public PurchaseInvoiceRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<PurchaseInvoice> CreateAsync(PurchaseInvoice invoice)
    {
        _dbContext.PurchaseInvoices.Add(invoice);
        await _dbContext.SaveChangesAsync();
        return invoice;
    }

    /// <inheritdoc />
    public async Task<PurchaseInvoice?> GetByIdAsync(int id)
    {
        return await _dbContext.PurchaseInvoices
            .AsNoTracking()
            .Include(p => p.Vendor)
            .Include(p => p.Items)
            .ThenInclude(i => i.Part)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    /// <inheritdoc />
    public async Task<List<PurchaseInvoice>> GetAllAsync()
    {
        return await _dbContext.PurchaseInvoices
            .AsNoTracking()
            .Include(p => p.Vendor)
            .Include(p => p.Items)
            .ThenInclude(i => i.Part)
            .OrderByDescending(p => p.PurchaseDate)
            .ThenByDescending(p => p.Id)
            .ToListAsync();
    }
}
