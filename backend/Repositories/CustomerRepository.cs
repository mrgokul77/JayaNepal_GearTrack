using System.Globalization;
using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories;

/// <inheritdoc cref="ICustomerRepository" />
public class CustomerRepository : ICustomerRepository
{
    private readonly ApplicationDbContext _dbContext;

    public CustomerRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<Customer> CreateAsync(Customer customer)
    {
        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync();
        return customer;
    }

    /// <inheritdoc />
    public async Task<Customer?> GetByIdAsync(int id)
    {
        return await _dbContext.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    /// <inheritdoc />
    public async Task<List<Customer>> GetAllAsync()
    {
        return await _dbContext.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .OrderBy(c => c.FullName)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<Customer?> GetByEmailAsync(string email)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return await _dbContext.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Email == normalized);
    }

    /// <inheritdoc />
    public async Task<List<Customer>> SearchAsync(string query)
    {
        var term = query.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(term))
        {
            return new List<Customer>();
        }

        var idMatches = int.TryParse(term, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id);

        // Resolve matching customer ids first so we never duplicate rows when a vehicle predicate is used.
        var customerIds = await _dbContext.Customers
            .AsNoTracking()
            .Where(c =>
                c.FullName.ToLower().Contains(term) ||
                c.Phone.ToLower().Contains(term) ||
                c.Email.ToLower().Contains(term) ||
                (idMatches && c.Id == id) ||
                c.Vehicles.Any(v => v.VehicleNumber.ToLower().Contains(term)))
            .Select(c => c.Id)
            .Distinct()
            .ToListAsync();

        if (customerIds.Count == 0)
        {
            return new List<Customer>();
        }

        return await _dbContext.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .Where(c => customerIds.Contains(c.Id))
            .OrderBy(c => c.FullName)
            .ToListAsync();
    }
}
