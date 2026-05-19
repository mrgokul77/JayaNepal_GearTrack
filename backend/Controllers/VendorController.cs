using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Admin-only CRUD for suppliers / vendors.</summary>
[ApiController]
[Route("api/vendors")]
[Authorize(Roles = "Admin")]
public class VendorController : ControllerBase
{
    private readonly IVendorService _vendorService;

    public VendorController(IVendorService vendorService)
    {
        _vendorService = vendorService;
    }

    /// <summary>Lists all vendors ordered by name.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<VendorResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<VendorResponseDto>>> GetAll()
    {
        var list = await _vendorService.GetAllVendorsAsync();
        return Ok(list);
    }

    /// <summary>Gets a single vendor by id.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(VendorResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VendorResponseDto>> GetById(int id)
    {
        var vendor = await _vendorService.GetVendorByIdAsync(id);
        if (vendor is null)
        {
            return NotFound();
        }

        return Ok(vendor);
    }

    /// <summary>Creates a new vendor.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(VendorResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VendorResponseDto>> Create([FromBody] CreateVendorDto dto)
    {
        try
        {
            var created = await _vendorService.CreateVendorAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Updates vendor fields.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(VendorResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VendorResponseDto>> Update(int id, [FromBody] UpdateVendorDto dto)
    {
        try
        {
            var updated = await _vendorService.UpdateVendorAsync(id, dto);
            if (updated is null)
            {
                return NotFound();
            }

            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Deletes a vendor when no parts or invoices reference it.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var deleted = await _vendorService.DeleteVendorAsync(id);
            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
        catch (backend.Exceptions.ReferencedEntityException ex)
        {
            return Conflict(ex.Message);
        }
    }
}
