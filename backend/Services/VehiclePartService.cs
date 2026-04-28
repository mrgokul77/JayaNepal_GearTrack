using backend.DTOs;
using backend.Models;
using backend.Repositories;

namespace backend.Services;

public class VehiclePartService : IVehiclePartService
{
    private readonly IVehiclePartRepository _repository;

    public VehiclePartService(IVehiclePartRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<VehiclePartDto>> GetAllAsync()
    {
        var parts = await _repository.GetAllAsync();
        return parts.Select(MapToDto).ToList();
    }

    public async Task<VehiclePartDto?> GetByIdAsync(int id)
    {
        var part = await _repository.GetByIdAsync(id);
        return part is null ? null : MapToDto(part);
    }

    public async Task<VehiclePartDto> CreateAsync(CreateVehiclePartDto dto)
    {
        var entity = new VehiclePart
        {
            Name = dto.Name,
            PartNumber = dto.PartNumber,
            Category = dto.Category,
            Price = dto.Price,
            QuantityInStock = dto.QuantityInStock,
            RoleVisibility = dto.RoleVisibility
        };

        var created = await _repository.AddAsync(entity);
        return MapToDto(created);
    }

    private static VehiclePartDto MapToDto(VehiclePart part)
    {
        return new VehiclePartDto
        {
            Id = part.Id,
            Name = part.Name,
            PartNumber = part.PartNumber,
            Category = part.Category,
            Price = part.Price,
            QuantityInStock = part.QuantityInStock,
            RoleVisibility = part.RoleVisibility
        };
    }
}
