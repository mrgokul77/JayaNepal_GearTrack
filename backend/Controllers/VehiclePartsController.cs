using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.Exceptions;

namespace backend.Controllers;

/// <summary>Vehicle parts catalog (inventory lines used by sales and purchase invoices).</summary>
[ApiController]
[Route("api/vehicle-parts")]
public class VehiclePartsController : ControllerBase
{
    private readonly IVehiclePartService _service;

    public VehiclePartsController(IVehiclePartService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(List<VehiclePartDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<VehiclePartDto>>> GetAll()
    {
        var parts = await _service.GetAllAsync();
        return Ok(parts);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(VehiclePartDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehiclePartDto>> GetById(int id)
    {
        var part = await _service.GetByIdAsync(id);
        if (part is null)
        {
            return NotFound();
        }

        return Ok(part);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(VehiclePartDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VehiclePartDto>> Create([FromBody] CreateVehiclePartDto dto)
    {
        try
        {
            var created = await _service.CreateAsync(dto);
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

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(VehiclePartDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehiclePartDto>> Update(int id, [FromBody] UpdateVehiclePartDto dto)
    {
        try
        {
            var updated = await _service.UpdateAsync(id, dto);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex) when (ex.Message == "Part not found.")
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var part = await _service.GetByIdAsync(id);
        if (part is null)
        {
            return NotFound();
        }

        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (ReferencedEntityException ex)
        {
            return Conflict(ex.Message);
        }
    }
}
