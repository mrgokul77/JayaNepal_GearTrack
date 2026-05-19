using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <inheritdoc cref="ISalesInvoiceService" />
public class SalesInvoiceService : ISalesInvoiceService
{
    private const decimal LoyaltyDiscountRate = 0.10m;
    private const decimal LoyaltyDiscountThreshold = 5000m;

    private readonly ApplicationDbContext _dbContext;
    private readonly ISalesInvoiceRepository _salesInvoiceRepository;

    public SalesInvoiceService(ApplicationDbContext dbContext, ISalesInvoiceRepository salesInvoiceRepository)
    {
        _dbContext = dbContext;
        _salesInvoiceRepository = salesInvoiceRepository;
    }

    /// <inheritdoc />
    public async Task<SalesInvoiceResponseDto> CreateAsync(CreateSalesInvoiceDto dto, int staffId)
    {
        ValidateDto(dto);

        var customerExists = await _dbContext.Customers.AnyAsync(c => c.Id == dto.CustomerId);
        if (!customerExists)
        {
            throw new InvalidOperationException("Customer not found.");
        }

        var staffExists = await _dbContext.StaffMembers.AnyAsync(s => s.Id == staffId);
        if (!staffExists)
        {
            throw new InvalidOperationException("Staff member not found.");
        }

        var partIds = dto.Items.Select(i => i.PartId).ToList();
        if (partIds.Count != partIds.Distinct().Count())
        {
            throw new ArgumentException("Duplicate part ids are not allowed on the same invoice.");
        }

        SalesInvoice invoice;

        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            // Gross subtotal before loyalty discount (stored on invoice as TotalAmount).
            decimal grossTotal = 0;
            var lineEntities = new List<SalesInvoiceItem>();

            foreach (var line in dto.Items)
            {
                var part = await _dbContext.VehicleParts.FirstOrDefaultAsync(p => p.Id == line.PartId);
                if (part is null)
                {
                    throw new InvalidOperationException($"Part id {line.PartId} was not found.");
                }

                if (part.StockQuantity < line.Quantity)
                {
                    throw new InvalidOperationException(
                        $"Insufficient stock for '{part.Name}' (id {part.Id}). Available: {part.StockQuantity}, requested: {line.Quantity}.");
                }

                var unitPrice = decimal.Round(part.Price, 2, MidpointRounding.AwayFromZero);
                var subTotal = decimal.Round(unitPrice * line.Quantity, 2, MidpointRounding.AwayFromZero);
                grossTotal += subTotal;

                part.StockQuantity -= line.Quantity;

                lineEntities.Add(new SalesInvoiceItem
                {
                    PartId = part.Id,
                    Quantity = line.Quantity,
                    UnitPrice = unitPrice,
                });
            }

            grossTotal = decimal.Round(grossTotal, 2, MidpointRounding.AwayFromZero);

            // 10% loyalty discount on the pre-discount total when over threshold.
            var discountApplied = grossTotal > LoyaltyDiscountThreshold
                ? decimal.Round(grossTotal * LoyaltyDiscountRate, 2, MidpointRounding.AwayFromZero)
                : 0m;

            invoice = new SalesInvoice
            {
                CustomerId = dto.CustomerId,
                StaffId = staffId,
                TotalAmount = grossTotal,
                DiscountApplied = discountApplied,
                SaleDate = DateTime.UtcNow,
                Items = lineEntities,
            };

            await _salesInvoiceRepository.CreateAsync(invoice);
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        var created = await _salesInvoiceRepository.GetByIdAsync(invoice.Id);
        if (created is null)
        {
            throw new InvalidOperationException("Invoice was created but could not be reloaded.");
        }

        return MapToDto(created);
    }

    /// <inheritdoc />
    public async Task<SalesInvoiceResponseDto?> GetByIdAsync(int id)
    {
        var entity = await _salesInvoiceRepository.GetByIdAsync(id);
        return entity is null ? null : MapToDto(entity);
    }

    /// <inheritdoc />
    public async Task<List<SalesInvoiceResponseDto>> GetAllAsync()
    {
        var list = await _salesInvoiceRepository.GetAllAsync();
        return list.Select(MapToDto).ToList();
    }

    /// <inheritdoc />
    public async Task<List<SalesInvoiceResponseDto>> GetByCustomerIdAsync(int customerId)
    {
        var list = await _salesInvoiceRepository.GetByCustomerIdAsync(customerId);
        return list.Select(MapToDto).ToList();
    }

    private static void ValidateDto(CreateSalesInvoiceDto dto)
    {
        if (dto.CustomerId <= 0)
        {
            throw new ArgumentException("Customer id must be positive.", nameof(dto));
        }

        if (dto.Items is null || dto.Items.Count == 0)
        {
            throw new ArgumentException("At least one line item is required.", nameof(dto));
        }

        foreach (var item in dto.Items)
        {
            if (item.PartId <= 0)
            {
                throw new ArgumentException("Each line must reference a valid part id.", nameof(dto));
            }

            if (item.Quantity <= 0)
            {
                throw new ArgumentException("Quantity must be greater than zero.", nameof(dto));
            }
        }
    }

    private static SalesInvoiceResponseDto MapToDto(SalesInvoice s)
    {
        var itemDtos = (s.Items ?? Enumerable.Empty<SalesInvoiceItem>())
            .OrderBy(i => i.Id)
            .Select(i =>
            {
                var subTotal = decimal.Round(i.UnitPrice * i.Quantity, 2, MidpointRounding.AwayFromZero);
                return new SalesInvoiceItemResponseDto
                {
                    Id = i.Id,
                    PartId = i.PartId,
                    PartName = i.Part?.Name ?? string.Empty,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    SubTotal = subTotal,
                };
            })
            .ToList();

        return new SalesInvoiceResponseDto
        {
            Id = s.Id,
            CustomerId = s.CustomerId,
            CustomerName = s.Customer.FullName,
            StaffId = s.StaffId,
            StaffName = s.Staff.FullName,
            TotalAmount = s.TotalAmount,
            DiscountApplied = s.DiscountApplied,
            SaleDate = s.SaleDate,
            IsPaid = s.IsPaid,
            Items = itemDtos,
        };
    }
}
