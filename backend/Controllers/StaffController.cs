using System.IdentityModel.Tokens.Jwt;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

/// <summary>
/// Admin staff management endpoints. The list combines both Admin and Staff
/// <see cref="User"/> rows; the linked <see cref="Staff"/> row (when present)
/// supplies the phone number. All ids in this controller refer to <c>User.Id</c>.
/// </summary>
[ApiController]
[Route("api/admin/staff")]
public class StaffController : ControllerBase
{
    private static readonly string[] AllowedRoles = ["Admin", "Staff"];

    private readonly ApplicationDbContext _context;

    public StaffController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<IEnumerable<StaffListItemDto>>> GetAllStaff()
    {
        var list = await (
            from u in _context.Users.AsNoTracking()
            where u.Role == "Admin" || u.Role == "Staff"
            join s in _context.StaffMembers.AsNoTracking() on u.Id equals s.UserId into staffGroup
            from staff in staffGroup.DefaultIfEmpty()
            orderby u.CreatedAt descending
            select new StaffListItemDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Phone = staff != null ? staff.Phone : string.Empty,
                Role = u.Role,
                CreatedAt = u.CreatedAt,
            }
        ).ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<StaffListItemDto>> GetStaffById(int id)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id && (u.Role == "Admin" || u.Role == "Staff"));

        if (user is null)
        {
            return NotFound();
        }

        var staff = await _context.StaffMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == id);

        return Ok(new StaffListItemDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = staff?.Phone ?? string.Empty,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<StaffListItemDto>> UpdateStaff(int id, [FromBody] UpdateStaffRequest? request)
    {
        if (request is null)
        {
            return BadRequest("Request body is required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("Full name is required.");
        }

        var normalizedRole = NormalizeRole(request.Role);
        if (normalizedRole is null)
        {
            return BadRequest("Role must be Admin or Staff.");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && (u.Role == "Admin" || u.Role == "Staff"));

        if (user is null)
        {
            return NotFound();
        }

        var trimmedName = request.FullName.Trim();
        var trimmedPhone = request.Phone?.Trim() ?? string.Empty;

        user.FullName = trimmedName;
        user.Role = normalizedRole;

        var staff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.UserId == id);
        if (staff is null)
        {
            // Only create a Staff profile row for non-admin roles. Admins do not need a row
            // unless they were already created with one in the past.
            if (normalizedRole == "Staff")
            {
                staff = new Staff
                {
                    UserId = user.Id,
                    FullName = trimmedName,
                    Email = user.Email,
                    Phone = trimmedPhone,
                    Role = "Staff",
                };
                _context.StaffMembers.Add(staff);
            }
        }
        else
        {
            // Keep the linked Staff row in sync. We deliberately keep it even when
            // promoting to Admin so historic SalesInvoice references stay valid.
            staff.FullName = trimmedName;
            staff.Phone = trimmedPhone;
            staff.Role = normalizedRole;
            staff.Email = user.Email;
        }

        await _context.SaveChangesAsync();

        return Ok(new StaffListItemDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = staff?.Phone ?? trimmedPhone,
            Role = user.Role,
            CreatedAt = user.CreatedAt,
        });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && (u.Role == "Admin" || u.Role == "Staff"));

        if (user is null)
        {
            return NotFound();
        }

        var currentUserIdRaw = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (int.TryParse(currentUserIdRaw, out var currentUserId) && currentUserId == id)
        {
            return Conflict("You cannot delete the account you are currently signed in with.");
        }

        var staff = await _context.StaffMembers.FirstOrDefaultAsync(s => s.UserId == id);
        if (staff is not null)
        {
            var linkedToInvoices = await _context.SalesInvoices.AnyAsync(i => i.StaffId == staff.Id);
            if (linkedToInvoices)
            {
                return Conflict("This staff member is linked to existing sales invoices and cannot be deleted.");
            }
            _context.StaffMembers.Remove(staff);
        }

        _context.Users.Remove(user);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var innerMsg = ex.InnerException?.Message ?? string.Empty;
            if (innerMsg.Contains("23503") || innerMsg.Contains("violates foreign key constraint"))
            {
                return Conflict("This staff member cannot be deleted because they have existing sales invoices linked to them.");
            }

            return Conflict("This account is referenced by other records and cannot be deleted.");
        }

        return NoContent();
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        var trimmed = role.Trim();
        var match = AllowedRoles.FirstOrDefault(r => r.Equals(trimmed, StringComparison.OrdinalIgnoreCase));
        return match;
    }

    public class StaffListItemDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateStaffRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string Role { get; set; } = string.Empty;
    }
}
