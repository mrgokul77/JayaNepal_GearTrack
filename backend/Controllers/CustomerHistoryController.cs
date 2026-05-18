using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/customer-history")]
[Authorize(Roles = "Admin,Staff")]
public class CustomerHistoryController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public CustomerHistoryController(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>Full customer profile with vehicles and purchase (sales) history.</summary>
    [HttpGet("{customerId:int}")]
    [ProducesResponseType(typeof(CustomerDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDetailDto>> GetFullProfile(int customerId)
    {
        var customer = await LoadCustomerWithHistoryAsync(customerId);
        if (customer is null)
        {
            return NotFound();
        }

        return Ok(MapCustomerDetail(customer));
    }

    [HttpGet("{customerId:int}/vehicles")]
    [ProducesResponseType(typeof(List<VehicleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<VehicleDto>>> GetVehicles(int customerId)
    {
        var exists = await _db.Customers.AsNoTracking().AnyAsync(c => c.Id == customerId);
        if (!exists)
        {
            return NotFound();
        }

        var vehicles = await _db.Vehicles.AsNoTracking()
            .Where(v => v.CustomerId == customerId)
            .OrderBy(v => v.VehicleNumber)
            .Select(v => new VehicleDto
            {
                Id = v.Id,
                VehicleNumber = v.VehicleNumber,
                Brand = v.Brand,
                Model = v.Model,
                Year = v.Year,
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    [HttpGet("{customerId:int}/purchases")]
    [ProducesResponseType(typeof(List<PurchaseHistoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<List<PurchaseHistoryDto>>> GetPurchases(int customerId)
    {
        var customer = await LoadCustomerWithHistoryAsync(customerId);
        if (customer is null)
        {
            return NotFound();
        }

        return Ok(MapPurchaseHistory(customer));
    }

    private async Task<Customer?> LoadCustomerWithHistoryAsync(int customerId)
    {
        return await _db.Customers.AsNoTracking()
            .AsSplitQuery()
            .Include(c => c.Vehicles)
            .Include(c => c.SalesInvoices)
            .ThenInclude(si => si.Items)
            .ThenInclude(i => i.Part)
            .Include(c => c.Appointments)
            .Include(c => c.PartRequests)
            .Include(c => c.ServiceReviews)
            .FirstOrDefaultAsync(c => c.Id == customerId);
    }

    private static CustomerDetailDto MapCustomerDetail(Customer customer)
    {
        return new CustomerDetailDto
        {
            Id = customer.Id,
            FullName = customer.FullName,
            Email = customer.Email,
            Phone = customer.Phone,
            Address = customer.Address,
            CreatedAt = customer.CreatedAt,
            Vehicles = customer.Vehicles
                .OrderBy(v => v.VehicleNumber)
                .Select(MapVehicle)
                .ToList(),
            PurchaseHistory = MapPurchaseHistory(customer),
            Appointments = customer.Appointments
                .OrderByDescending(a => a.AppointmentDate)
                .ThenByDescending(a => a.Id)
                .Select(a => new CustomerAppointmentDto
                {
                    Id = a.Id,
                    AppointmentDate = a.AppointmentDate,
                    ServiceType = a.ServiceType,
                    Status = a.Status,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt,
                })
                .ToList(),
            PartRequests = customer.PartRequests
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.Id)
                .Select(p => new CustomerPartRequestDto
                {
                    Id = p.Id,
                    PartName = p.PartName,
                    Description = p.Description,
                    Status = p.Status,
                    CreatedAt = p.CreatedAt,
                })
                .ToList(),
            ServiceReviews = customer.ServiceReviews
                .OrderByDescending(s => s.CreatedAt)
                .ThenByDescending(s => s.Id)
                .Select(s => new CustomerServiceReviewDto
                {
                    Id = s.Id,
                    Rating = s.Rating,
                    Comment = s.Comment,
                    CreatedAt = s.CreatedAt,
                })
                .ToList(),
        };
    }

    private static List<PurchaseHistoryDto> MapPurchaseHistory(Customer customer)
    {
        return customer.SalesInvoices
            .OrderByDescending(si => si.SaleDate)
            .ThenByDescending(si => si.Id)
            .Select(si => new PurchaseHistoryDto
            {
                Id = si.Id,
                SaleDate = si.SaleDate,
                TotalAmount = si.TotalAmount,
                DiscountApplied = si.DiscountApplied,
                Items = si.Items
                    .OrderBy(i => i.Id)
                    .Select(MapPurchaseItem)
                    .ToList(),
            })
            .ToList();
    }

    private static VehicleDto MapVehicle(Vehicle v)
    {
        return new VehicleDto
        {
            Id = v.Id,
            VehicleNumber = v.VehicleNumber,
            Brand = v.Brand,
            Model = v.Model,
            Year = v.Year,
        };
    }

    private static PurchaseItemDto MapPurchaseItem(SalesInvoiceItem item)
    {
        var subTotal = item.Quantity * item.UnitPrice;
        return new PurchaseItemDto
        {
            PartName = item.Part?.Name ?? string.Empty,
            Quantity = item.Quantity,
            UnitPrice = item.UnitPrice,
            SubTotal = subTotal,
        };
    }
}
