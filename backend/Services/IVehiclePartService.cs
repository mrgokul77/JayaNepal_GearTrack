using backend.DTOs;

namespace backend.Services;

public interface IVehiclePartService
{
    Task<List<VehiclePartDto>> GetAllAsync();
    Task<VehiclePartDto?> GetByIdAsync(int id);
    Task<VehiclePartDto> CreateAsync(CreateVehiclePartDto dto);
    Task<VehiclePartDto> UpdateAsync(int id, UpdateVehiclePartDto dto);
    Task DeleteAsync(int id);
}
