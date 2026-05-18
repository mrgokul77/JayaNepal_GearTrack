using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>Staff and admin APIs for vehicle part sales invoices.</summary>
[ApiController]
[Route("api/sales-invoices")]
[Authorize(Roles = "Admin,Staff")]
public class SalesInvoiceController : ControllerBase
{
    private readonly ISalesInvoiceService _salesInvoiceService;
    private readonly IEmailService _emailService;
    private readonly ApplicationDbContext _dbContext;

    public SalesInvoiceController(
        ISalesInvoiceService salesInvoiceService,
        IEmailService emailService,
        ApplicationDbContext dbContext)
    {
        _salesInvoiceService = salesInvoiceService;
        _emailService = emailService;
        _dbContext = dbContext;
    }

    /// <summary>Lists all sales invoices with lines, customer, and staff.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<SalesInvoiceResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<SalesInvoiceResponseDto>>> GetAll()
    {
        var list = await _salesInvoiceService.GetAllAsync();
        return Ok(list);
    }

    /// <summary>Gets invoices for a specific customer.</summary>
    [HttpGet("customer/{customerId:int}")]
    [ProducesResponseType(typeof(List<SalesInvoiceResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<SalesInvoiceResponseDto>>> GetByCustomerId(int customerId)
    {
        var list = await _salesInvoiceService.GetByCustomerIdAsync(customerId);
        return Ok(list);
    }

    /// <summary>Gets a single sales invoice by id.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(SalesInvoiceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SalesInvoiceResponseDto>> GetById(int id)
    {
        var invoice = await _salesInvoiceService.GetByIdAsync(id);
        if (invoice is null)
        {
            return NotFound();
        }

        return Ok(invoice);
    }

    /// <summary>Sends the invoice as an HTML email to the customer's address on file (SMTP from <c>EmailSettings</c>).</summary>
    [HttpPost("{id:int}/send-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendInvoiceEmail(int id)
    {
        try
        {
            await _emailService.SendInvoiceEmailAsync(id);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }

        return Ok(new { message = "Invoice sent to customer" });
    }

    /// <summary>
    /// Creates a sales invoice: prices from catalog, stock deduction, optional 10% loyalty discount when subtotal exceeds 5000.
    /// Staff id is resolved from the JWT subject (user id → staff profile).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(SalesInvoiceResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SalesInvoiceResponseDto>> Create([FromBody] CreateSalesInvoiceDto dto)
    {
        var userId = ResolveAuthenticatedUserId();
        if (userId is null)
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var staffId = await ResolveStaffIdForUserAsync(userId.Value);
        if (staffId is null)
        {
            return BadRequest(
                "No staff profile is linked to this user account. Sales must be recorded by a user with a staff profile.");
        }

        try
        {
            var created = await _salesInvoiceService.CreateAsync(dto, staffId.Value);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private int? ResolveAuthenticatedUserId()
    {
        var sub =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(sub, out var id) ? id : null;
    }

    /// <summary>Maps application user id to staff row id (one staff profile per user).</summary>
    private async Task<int?> ResolveStaffIdForUserAsync(int userId)
    {
        var staff = await _dbContext.StaffMembers.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId);
        return staff?.Id;
    }
}
