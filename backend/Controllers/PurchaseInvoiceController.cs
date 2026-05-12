using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Admin-only purchase invoices for vendor stock intake.</summary>
[ApiController]
[Route("api/purchase-invoices")]
[Authorize(Roles = "Admin")]
public class PurchaseInvoiceController : ControllerBase
{
    private readonly IPurchaseInvoiceService _purchaseInvoiceService;

    public PurchaseInvoiceController(IPurchaseInvoiceService purchaseInvoiceService)
    {
        _purchaseInvoiceService = purchaseInvoiceService;
    }

    /// <summary>Lists all purchase invoices with lines and vendor names.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<PurchaseInvoiceResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<PurchaseInvoiceResponseDto>>> GetAll()
    {
        var list = await _purchaseInvoiceService.GetAllAsync();
        return Ok(list);
    }

    /// <summary>Gets a single purchase invoice.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PurchaseInvoiceResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseInvoiceResponseDto>> GetById(int id)
    {
        var invoice = await _purchaseInvoiceService.GetByIdAsync(id);
        if (invoice is null)
        {
            return NotFound();
        }

        return Ok(invoice);
    }

    /// <summary>Creates a purchase invoice and increases stock for each catalog part line.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PurchaseInvoiceResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PurchaseInvoiceResponseDto>> Create([FromBody] CreatePurchaseInvoiceDto dto)
    {
        var adminId = ResolveAdminUserId();
        if (adminId is null)
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        try
        {
            var created = await _purchaseInvoiceService.CreateAsync(dto, adminId.Value);
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

    private int? ResolveAdminUserId()
    {
        var sub =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(sub, out var id) ? id : null;
    }
}
