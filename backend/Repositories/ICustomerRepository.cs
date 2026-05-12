using backend.Models;

namespace backend.Repositories;

/// <summary>
/// Persistence operations for <see cref="Customer"/> aggregates (including related vehicles for reads).
/// </summary>
public interface ICustomerRepository
{
    /// <summary>Inserts a new customer row. The related <see cref="Customer.UserId"/> must already reference a persisted user.</summary>
    Task<Customer> CreateAsync(Customer customer);

    /// <summary>Loads a customer by primary key, including vehicles.</summary>
    Task<Customer?> GetByIdAsync(int id);

    /// <summary>Loads all customers with their vehicles.</summary>
    Task<List<Customer>> GetAllAsync();

    /// <summary>Finds a customer by email (case-insensitive), including vehicles.</summary>
    Task<Customer?> GetByEmailAsync(string email);

    /// <summary>
    /// Finds customers whose name, phone, email, id, or any linked vehicle number matches the query (case-insensitive).
    /// Each customer is returned once with all vehicles included.
    /// </summary>
    Task<List<Customer>> SearchAsync(string query);
}
