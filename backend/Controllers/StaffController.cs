using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/admin/staff")]
public class StaffController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public StaffController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateStaff([FromBody] StaffMemberRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
        {
            return BadRequest("No user found with this UserId.");
        }

        var alreadyRegistered = await _context.StaffMembers.AnyAsync(s => s.UserId == request.UserId);
        if (alreadyRegistered)
        {
            return BadRequest("This user is already registered as staff.");
        }

        var staff = new Staff
        {
            FullName = request.Name.Trim(),
            Email = request.Email.Trim(),
            Role = string.IsNullOrWhiteSpace(request.Role) ? "Staff" : request.Role.Trim(),
            Phone = request.Phone?.Trim() ?? string.Empty,
            UserId = request.UserId
        };

        await _context.StaffMembers.AddAsync(staff);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetStaffById), new { id = staff.Id }, ToResponse(staff));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetAllStaff()
    {
        var staffList = await _context.StaffMembers
            .AsNoTracking()
            .Select(s => ToResponse(s))
            .ToListAsync();

        return Ok(staffList);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetStaffById(int id)
    {
        var staff = await _context.StaffMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (staff is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(staff));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] StaffMemberRequest request)
    {
        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var existingStaff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.Id == id);
        if (existingStaff is null)
        {
            return NotFound();
        }

        var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId);
        if (!userExists)
        {
            return BadRequest("No user found with this UserId.");
        }

        var userLinkedToAnotherStaff = await _context.StaffMembers
            .AnyAsync(s => s.Id != id && s.UserId == request.UserId);
        if (userLinkedToAnotherStaff)
        {
            return BadRequest("This user is already linked to another staff member.");
        }

        existingStaff.FullName = request.Name.Trim();
        existingStaff.Email = request.Email.Trim();
        existingStaff.Role = string.IsNullOrWhiteSpace(request.Role) ? existingStaff.Role : request.Role.Trim();
        existingStaff.Phone = request.Phone?.Trim() ?? string.Empty;
        existingStaff.UserId = request.UserId;

        await _context.SaveChangesAsync();

        return Ok(ToResponse(existingStaff));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var existingStaff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.Id == id);
        if (existingStaff is null)
        {
            return NotFound();
        }

        _context.StaffMembers.Remove(existingStaff);
        await _context.SaveChangesAsync();

        return Ok();
    }

    private static string? ValidateRequest(StaffMemberRequest? request)
    {
        if (request is null)
        {
            return "Request body is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return "Name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return "Email is required.";
        }

        if (request.UserId <= 0)
        {
            return "Valid UserId is required.";
        }

        return null;
    }

    private static StaffMemberResponse ToResponse(Staff staff)
    {
        return new StaffMemberResponse
        {
            Id = staff.Id,
            Name = staff.FullName,
            Email = staff.Email,
            Role = staff.Role,
            Phone = staff.Phone
        };
    }

    public class StaffMemberRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public int UserId { get; set; }
    }

    public class StaffMemberResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
    }
}
