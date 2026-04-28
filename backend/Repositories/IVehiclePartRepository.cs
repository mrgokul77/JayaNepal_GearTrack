using backend.Models;

namespace backend.Repositories;

public interface IVehiclePartRepository
{
    Task<List<VehiclePart>> GetAllAsync();
    Task<VehiclePart?> GetByIdAsync(int id);
    Task<VehiclePart> AddAsync(VehiclePart part);
}
