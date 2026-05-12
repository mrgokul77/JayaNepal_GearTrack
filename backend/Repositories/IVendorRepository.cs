using backend.Models;

namespace backend.Repositories;

/// <summary>Persistence operations for <see cref="Vendor"/>.</summary>
public interface IVendorRepository
{
    Task<Vendor> CreateAsync(Vendor vendor);
    Task<Vendor?> GetByIdAsync(int id);
    Task<List<Vendor>> GetAllAsync();
    Task<Vendor> UpdateAsync(Vendor vendor);
    Task<bool> DeleteAsync(int id);
}
