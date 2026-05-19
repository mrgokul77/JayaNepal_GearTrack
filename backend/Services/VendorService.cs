using backend.DTOs;
using backend.Models;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Validates vendor input, maps entities to DTOs, and coordinates repository persistence.
/// </summary>
public class VendorService : IVendorService
{
    private readonly IVendorRepository _vendorRepository;

    public VendorService(IVendorRepository vendorRepository)
    {
        _vendorRepository = vendorRepository;
    }

    /// <inheritdoc />
    public async Task<VendorResponseDto> CreateVendorAsync(CreateVendorDto dto)
    {
        ValidateVendorFields(dto.Name, dto.Phone, dto.Email, dto.Address);

        var vendor = new Vendor
        {
            Name = dto.Name.Trim(),
            Phone = dto.Phone.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            Address = (dto.Address ?? string.Empty).Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        var created = await _vendorRepository.CreateAsync(vendor);
        return MapToResponse(created);
    }

    /// <inheritdoc />
    public async Task<VendorResponseDto?> GetVendorByIdAsync(int id)
    {
        var entity = await _vendorRepository.GetByIdAsync(id);
        return entity is null ? null : MapToResponse(entity);
    }

    /// <inheritdoc />
    public async Task<List<VendorResponseDto>> GetAllVendorsAsync()
    {
        var list = await _vendorRepository.GetAllAsync();
        return list.Select(MapToResponse).ToList();
    }

    /// <inheritdoc />
    public async Task<VendorResponseDto?> UpdateVendorAsync(int id, UpdateVendorDto dto)
    {
        ValidateVendorFields(dto.Name, dto.Phone, dto.Email, dto.Address);

        var existing = await _vendorRepository.GetByIdAsync(id);
        if (existing is null)
        {
            return null;
        }

        existing.Name = dto.Name.Trim();
        existing.Phone = dto.Phone.Trim();
        existing.Email = dto.Email.Trim().ToLowerInvariant();
        existing.Address = (dto.Address ?? string.Empty).Trim();

        var updated = await _vendorRepository.UpdateAsync(existing);
        return MapToResponse(updated);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteVendorAsync(int id)
    {
        return await _vendorRepository.DeleteAsync(id);
    }

    private static void ValidateVendorFields(string name, string phone, string email, string? address)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Name is required.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(phone))
        {
            throw new ArgumentException("Phone is required.", nameof(phone));
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required.", nameof(email));
        }

        if (name.Length > 150)
        {
            throw new ArgumentException("Name must be at most 150 characters.", nameof(name));
        }

        if (phone.Length > 30)
        {
            throw new ArgumentException("Phone must be at most 30 characters.", nameof(phone));
        }

        if (email.Length > 150)
        {
            throw new ArgumentException("Email must be at most 150 characters.", nameof(email));
        }

        if ((address?.Length ?? 0) > 300)
        {
            throw new ArgumentException("Address must be at most 300 characters.", nameof(address));
        }
    }

    private static VendorResponseDto MapToResponse(Vendor v)
    {
        return new VendorResponseDto
        {
            Id = v.Id,
            Name = v.Name,
            Phone = v.Phone,
            Email = v.Email,
            Address = v.Address,
            CreatedAt = v.CreatedAt,
        };
    }
}
