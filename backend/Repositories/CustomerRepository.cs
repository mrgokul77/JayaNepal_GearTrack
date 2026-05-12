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
}
