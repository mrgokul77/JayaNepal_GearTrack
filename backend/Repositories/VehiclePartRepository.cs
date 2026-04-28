using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

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

    public async Task<VehiclePart> AddAsync(VehiclePart part)
    {
        _dbContext.VehicleParts.Add(part);
        await _dbContext.SaveChangesAsync();
        return part;
    }
}
