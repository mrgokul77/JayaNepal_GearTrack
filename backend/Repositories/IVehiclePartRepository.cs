using backend.Models;

namespace backend.Repositories;

public interface IVehiclePartRepository
{
    Task<List<VehiclePart>> GetAllAsync();
    Task<VehiclePart?> GetByIdAsync(int id);
    Task<VehiclePart?> GetTrackedByIdAsync(int id);
    Task<bool> VendorExistsAsync(int vendorId);
    Task<VehiclePart> AddAsync(VehiclePart part);
    Task DeleteAsync(int id);
    Task SaveChangesAsync();
}
