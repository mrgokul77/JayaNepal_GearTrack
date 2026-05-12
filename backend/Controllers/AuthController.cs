using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private static readonly string[] StaffOrAdminRoles = ["Admin", "Staff"];

    private readonly ApplicationDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IPasswordHasher<User> _passwordHasher;

    public AuthController(
        ApplicationDbContext dbContext,
        IConfiguration configuration,
        IPasswordHasher<User> passwordHasher)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
    }

    /// <summary>Customer self-registration only.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] CustomerRegisterRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest("Phone is required.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (existingUser is not null)
        {
            return Conflict("A user with this email already exists.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Role = "Customer",
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var customer = new Customer
        {
            FullName = user.FullName,
            Email = user.Email,
            Phone = request.Phone.Trim(),
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Customers.Add(customer);
        await _dbContext.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        return Ok(BuildAuthResponse(user, token));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user is null)
        {
            return Unauthorized("Invalid credentials.");
        }

        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized("Invalid credentials.");
        }

        var token = GenerateJwtToken(user);
        return Ok(BuildAuthResponse(user, token));
    }

    /// <summary>Admin creates Staff or additional Admin accounts.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("register-staff")]
    public async Task<ActionResult<AuthResponseDto>> RegisterStaff([FromBody] RegisterStaffRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and password are required.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Phone))
        {
            return BadRequest("Phone is required.");
        }

        var role = request.Role?.Trim() ?? string.Empty;
        if (!StaffOrAdminRoles.Contains(role, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest("Role must be Staff or Admin.");
        }

        var normalizedRole = role.Equals("Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "Staff";

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (existingUser is not null)
        {
            return Conflict("A user with this email already exists.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            Role = normalizedRole,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        if (normalizedRole == "Staff")
        {
            var staff = new Staff
            {
                FullName = user.FullName,
                Email = user.Email,
                Phone = request.Phone.Trim(),
                Role = "Staff",
                UserId = user.Id
            };
            _dbContext.StaffMembers.Add(staff);
            await _dbContext.SaveChangesAsync();
        }

        var token = GenerateJwtToken(user);
        return Ok(BuildAuthResponse(user, token));
    }

    private static AuthResponseDto BuildAuthResponse(User user, string token) =>
        new()
        {
            Token = token,
            Role = user.Role,
            UserId = user.Id,
            FullName = user.FullName
        };

    private string GenerateJwtToken(User user)
    {
        var jwt = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new("fullName", user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(double.Parse(jwt["ExpiryMinutes"] ?? "120")),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
