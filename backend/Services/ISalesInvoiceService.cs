using backend.DTOs;

namespace backend.Services;

/// <summary>Staff/admin sales of vehicle parts with optional loyalty discount.</summary>
public interface ISalesInvoiceService
{
    Task<SalesInvoiceResponseDto> CreateAsync(CreateSalesInvoiceDto dto, int staffId);
    Task<SalesInvoiceResponseDto?> GetByIdAsync(int id);
    Task<List<SalesInvoiceResponseDto>> GetAllAsync();
    Task<List<SalesInvoiceResponseDto>> GetByCustomerIdAsync(int customerId);
}
