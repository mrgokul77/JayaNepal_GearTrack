using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <inheritdoc cref="IPurchaseInvoiceService" />
public class PurchaseInvoiceService : IPurchaseInvoiceService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IPurchaseInvoiceRepository _purchaseInvoiceRepository;

    public PurchaseInvoiceService(
        ApplicationDbContext dbContext,
        IPurchaseInvoiceRepository purchaseInvoiceRepository)
    {
        _dbContext = dbContext;
        _purchaseInvoiceRepository = purchaseInvoiceRepository;
    }

    /// <inheritdoc />
    public async Task<PurchaseInvoiceResponseDto> CreateAsync(CreatePurchaseInvoiceDto dto, int adminId)
    {
        ValidateDto(dto);

        var vendorExists = await _dbContext.Vendors.AnyAsync(v => v.Id == dto.VendorId);
        if (!vendorExists)
        {
            throw new InvalidOperationException("Vendor not found.");
        }

        var adminExists = await _dbContext.Users.AnyAsync(u => u.Id == adminId);
        if (!adminExists)
        {
            throw new InvalidOperationException("Admin user not found.");
        }

        var partIds = dto.Items.Select(i => i.PartId).Distinct().ToList();
        if (partIds.Count != dto.Items.Count)
        {
            throw new ArgumentException("Duplicate part ids are not allowed on the same invoice.");
        }

        PurchaseInvoice invoice;

        await using var transaction = await _dbContext.Database.BeginTransactionAsync();
        try
        {
            decimal total = 0;
            foreach (var line in dto.Items)
            {
                var part = await _dbContext.VehicleParts.FirstOrDefaultAsync(p => p.Id == line.PartId);
                if (part is null)
                {
                    throw new InvalidOperationException($"Part id {line.PartId} was not found.");
                }

                if (part.VendorId != dto.VendorId)
                {
                    throw new InvalidOperationException(
                        $"Part '{part.Name}' (id {part.Id}) does not belong to the selected vendor.");
                }

                total += line.Quantity * line.UnitPrice;
                part.StockQuantity += line.Quantity;
            }

            invoice = new PurchaseInvoice
            {
                VendorId = dto.VendorId,
                AdminId = adminId,
                PurchaseDate = DateTime.UtcNow,
                TotalAmount = decimal.Round(total, 2, MidpointRounding.AwayFromZero),
                Items = dto.Items.Select(i => new PurchaseInvoiceItem
                {
                    PartId = i.PartId,
                    Quantity = i.Quantity,
                    UnitPrice = decimal.Round(i.UnitPrice, 2, MidpointRounding.AwayFromZero),
                }).ToList(),
            };

            await _purchaseInvoiceRepository.CreateAsync(invoice);
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        var created = await _purchaseInvoiceRepository.GetByIdAsync(invoice.Id);
        if (created is null)
        {
            throw new InvalidOperationException("Invoice was created but could not be reloaded.");
        }

        return MapToDto(created);
    }

    /// <inheritdoc />
    public async Task<PurchaseInvoiceResponseDto?> GetByIdAsync(int id)
    {
        var entity = await _purchaseInvoiceRepository.GetByIdAsync(id);
        return entity is null ? null : MapToDto(entity);
    }

    /// <inheritdoc />
    public async Task<List<PurchaseInvoiceResponseDto>> GetAllAsync()
    {
        var list = await _purchaseInvoiceRepository.GetAllAsync();
        return list.Select(MapToDto).ToList();
    }

    private static void ValidateDto(CreatePurchaseInvoiceDto dto)
    {
        if (dto.VendorId <= 0)
        {
            throw new ArgumentException("Vendor id must be positive.", nameof(dto));
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

            if (item.UnitPrice < 0)
            {
                throw new ArgumentException("Unit price cannot be negative.", nameof(dto));
            }
        }
    }

    private static PurchaseInvoiceResponseDto MapToDto(PurchaseInvoice p)
    {
        return new PurchaseInvoiceResponseDto
        {
            Id = p.Id,
            VendorId = p.VendorId,
            VendorName = p.Vendor.Name,
            TotalAmount = p.TotalAmount,
            PurchaseDate = p.PurchaseDate,
            AdminId = p.AdminId,
            Items = (p.Items ?? Enumerable.Empty<PurchaseInvoiceItem>())
                .OrderBy(i => i.Id)
                .Select(i => new PurchaseInvoiceItemResponseDto
                {
                    Id = i.Id,
                    PartId = i.PartId,
                    PartName = i.Part.Name,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                })
                .ToList(),
        };
    }
}
