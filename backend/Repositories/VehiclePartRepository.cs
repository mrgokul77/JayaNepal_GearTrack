using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using backend.Exceptions;

namespace backend.Repositories;

public class VehiclePartRepository : IVehiclePartRepository
{
    private readonly ApplicationDbContext _dbContext;

    public VehiclePartRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<VehiclePart>> GetAllAsync()
    {
        return await _dbContext.VehicleParts.AsNoTracking().ToListAsync();
    }

    public async Task<VehiclePart?> GetByIdAsync(int id)
    {
        return await _dbContext.VehicleParts.AsNoTracking().FirstOrDefaultAsync(v => v.Id == id);
    }

    public async Task<VehiclePart?> GetTrackedByIdAsync(int id)
    {
        return await _dbContext.VehicleParts.FirstOrDefaultAsync(v => v.Id == id);
    }

    public async Task<bool> VendorExistsAsync(int vendorId)
    {
        return await _dbContext.Vendors.AsNoTracking().AnyAsync(v => v.Id == vendorId);
    }

    public async Task<VehiclePart> AddAsync(VehiclePart part)
    {
        _dbContext.VehicleParts.Add(part);
        await _dbContext.SaveChangesAsync();
        return part;
    }

    public async Task DeleteAsync(int id)
    {
        var part = await _dbContext.VehicleParts.FirstOrDefaultAsync(v => v.Id == id);
        if (part != null)
        {
            _dbContext.VehicleParts.Remove(part);
            try
            {
                await _dbContext.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                var innerMsg = ex.InnerException?.Message ?? string.Empty;
                if (innerMsg.Contains("23503") || innerMsg.Contains("violates foreign key constraint"))
                {
                    throw new ReferencedEntityException("This part cannot be deleted because it is referenced in existing invoices.");
                }

                throw;
            }
        }
    }

    public async Task SaveChangesAsync()
    {
        await _dbContext.SaveChangesAsync();
    }
}
