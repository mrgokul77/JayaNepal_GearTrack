using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VehiclePartsController : ControllerBase
{
    private readonly IVehiclePartService _service;

    public VehiclePartsController(IVehiclePartService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<VehiclePartDto>>> GetAll()
    {
        var parts = await _service.GetAllAsync();
        return Ok(parts);
    }

    [HttpGet("{id:int}")]
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
    public async Task<ActionResult<VehiclePartDto>> Create([FromBody] CreateVehiclePartDto dto)
    {
        var created = await _service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
}
