using backend.DTOs;

namespace backend.Services;

/// <summary>Admin vendor catalog: CRUD and mapping to DTOs.</summary>
public interface IVendorService
{
    Task<VendorResponseDto> CreateVendorAsync(CreateVendorDto dto);
    Task<VendorResponseDto?> GetVendorByIdAsync(int id);
    Task<List<VendorResponseDto>> GetAllVendorsAsync();
    Task<VendorResponseDto?> UpdateVendorAsync(int id, UpdateVendorDto dto);
    Task<bool> DeleteVendorAsync(int id);
}
