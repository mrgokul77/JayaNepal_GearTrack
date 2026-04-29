using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/admin/parts")]
public class PartsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public PartsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePart([FromBody] Part part)
    {
        if (!IsValidPart(part))
        {
            return BadRequest("Name is required, and Price/StockQuantity must be greater than 0.");
        }

        part.Name = part.Name.Trim();
        await _context.Parts.AddAsync(part);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPartById), new { id = part.Id }, part);
    }

    [HttpGet]
    public async Task<IActionResult> GetAllParts()
    {
        var parts = await _context.Parts.ToListAsync();
        return Ok(parts);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetPartById(int id)
    {
        var part = await _context.Parts.FindAsync(id);
        if (part is null)
        {
            return NotFound();
        }

        return Ok(part);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdatePart(int id, [FromBody] Part request)
    {
        if (!IsValidPart(request))
        {
            return BadRequest("Name is required, and Price/StockQuantity must be greater than 0.");
        }

        var existingPart = await _context.Parts.FindAsync(id);
        if (existingPart is null)
        {
            return NotFound();
        }

        existingPart.Name = request.Name.Trim();
        existingPart.Price = request.Price;
        existingPart.StockQuantity = request.StockQuantity;

        await _context.SaveChangesAsync();

        return Ok(existingPart);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeletePart(int id)
    {
        var existingPart = await _context.Parts.FindAsync(id);
        if (existingPart is null)
        {
            return NotFound();
        }

        _context.Parts.Remove(existingPart);
        await _context.SaveChangesAsync();

        return Ok();
    }

    private static bool IsValidPart(Part part)
    {
        return !string.IsNullOrWhiteSpace(part.Name)
               && part.Price > 0
               && part.StockQuantity > 0;
    }
}
