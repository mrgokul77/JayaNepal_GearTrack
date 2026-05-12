using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

/// <inheritdoc cref="IVendorRepository" />
public class VendorRepository : IVendorRepository
{
    private readonly ApplicationDbContext _dbContext;

    public VendorRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<Vendor> CreateAsync(Vendor vendor)
    {
        _dbContext.Vendors.Add(vendor);
        await _dbContext.SaveChangesAsync();
        return vendor;
    }

    /// <inheritdoc />
    public async Task<Vendor?> GetByIdAsync(int id)
    {
        return await _dbContext.Vendors
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id);
    }

    /// <inheritdoc />
    public async Task<List<Vendor>> GetAllAsync()
    {
        return await _dbContext.Vendors
            .AsNoTracking()
            .OrderBy(v => v.Name)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<Vendor> UpdateAsync(Vendor vendor)
    {
        _dbContext.Vendors.Update(vendor);
        await _dbContext.SaveChangesAsync();
        return vendor;
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await _dbContext.Vendors.FindAsync(id);
        if (entity is null)
        {
            return false;
        }

        _dbContext.Vendors.Remove(entity);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}
