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
        ValidatePartWrite(dto);

        if (!await _repository.VendorExistsAsync(dto.VendorId))
        {
            throw new InvalidOperationException("Vendor not found.");
        }

        var entity = new VehiclePart
        {
            Name = dto.Name.Trim(),
            Description = (dto.Description ?? string.Empty).Trim(),
            Price = dto.Price,
            StockQuantity = dto.StockQuantity,
            VendorId = dto.VendorId
        };

        var created = await _repository.AddAsync(entity);
        return MapToDto(created);
    }

    public async Task<VehiclePartDto> UpdateAsync(int id, UpdateVehiclePartDto dto)
    {
        ValidatePartWrite(dto);

        if (!await _repository.VendorExistsAsync(dto.VendorId))
        {
            throw new InvalidOperationException("Vendor not found.");
        }

        var entity = await _repository.GetTrackedByIdAsync(id);
        if (entity is null)
        {
            throw new InvalidOperationException("Part not found.");
        }

        entity.Name = dto.Name.Trim();
        entity.Description = (dto.Description ?? string.Empty).Trim();
        entity.Price = dto.Price;
        entity.StockQuantity = dto.StockQuantity;
        entity.VendorId = dto.VendorId;

        await _repository.SaveChangesAsync();
        return MapToDto(entity);
    }

    public async Task DeleteAsync(int id)
    {
        await _repository.DeleteAsync(id);
    }

    private static void ValidatePartWrite(CreateVehiclePartDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Name is required.");
        }

        if (dto.VendorId <= 0)
        {
            throw new ArgumentException("A valid vendor is required.");
        }

        if (dto.Price < 0)
        {
            throw new ArgumentException("Price cannot be negative.");
        }

        if (dto.StockQuantity < 0)
        {
            throw new ArgumentException("Stock quantity cannot be negative.");
        }
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
