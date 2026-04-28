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
            Description = dto.Description,
            Price = dto.Price,
            StockQuantity = dto.StockQuantity,
            VendorId = dto.VendorId
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
            Description = part.Description,
            Price = part.Price,
            StockQuantity = part.StockQuantity,
            VendorId = part.VendorId
        };
    }
}
