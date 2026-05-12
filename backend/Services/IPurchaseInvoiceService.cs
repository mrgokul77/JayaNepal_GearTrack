using backend.DTOs;

namespace backend.Services;

/// <summary>Admin purchase invoices: stock intake from vendors.</summary>
public interface IPurchaseInvoiceService
{
    /// <summary>Creates an invoice, increases <see cref="Models.VehiclePart"/> stock for each line, and sets total from lines.</summary>
    Task<PurchaseInvoiceResponseDto> CreateAsync(CreatePurchaseInvoiceDto dto, int adminId);

    /// <summary>Gets one invoice or null.</summary>
    Task<PurchaseInvoiceResponseDto?> GetByIdAsync(int id);

    /// <summary>Lists all purchase invoices.</summary>
    Task<List<PurchaseInvoiceResponseDto>> GetAllAsync();
}
