using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        ApplicationDbContext dbContext,
        IConfiguration configuration,
        IPasswordHasher<User> passwordHasher,
        ILogger<AuthController> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto request)
    {
        try
        {
            _logger.LogInformation("Register request received for email: {Email}, role: {Role}", request.Email, request.Role);

            if (string.IsNullOrWhiteSpace(request.FullName) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Phone) ||
                string.IsNullOrWhiteSpace(request.Password) ||
                string.IsNullOrWhiteSpace(request.Role))
            {
                _logger.LogWarning("Register validation failed due to missing fields for email: {Email}", request.Email);
                return BadRequest("FullName, Email, Phone, Password, and Role are required.");
            }

            if (!string.Equals(request.Role, "Customer", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Rejected non-customer self-registration attempt. Email: {Email}, Role: {Role}", request.Email, request.Role);
                return BadRequest("Self-registration is only available for customers.");
            }

            if (request.Password.Length < 6)
            {
                _logger.LogWarning("Password too short for email: {Email}", request.Email);
                return BadRequest("Password must be at least 6 characters.");
            }

            var fullName = request.FullName.Trim();
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var normalizedPhone = request.Phone.Trim();
            var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
            if (existingUser is not null)
            {
                _logger.LogWarning("Registration conflict for existing email: {Email}", normalizedEmail);
                return Conflict("A user with this email already exists.");
            }

            var user = new User
            {
                FullName = fullName,
                Email = normalizedEmail,
                Role = "Customer",
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync();

            var customer = new Customer
            {
                FullName = fullName,
                Email = normalizedEmail,
                Phone = normalizedPhone,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.Customers.Add(customer);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Registration successful for email: {Email}, userId: {UserId}", normalizedEmail, user.Id);

            var token = GenerateJwtToken(user);
            return Ok(new AuthResponseDto
            {
                Token = token,
                Role = user.Role,
                UserId = user.Id,
                FullName = user.FullName
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error during registration for email: {Email}", request.Email);
            return StatusCode(StatusCodes.Status500InternalServerError, "Registration failed due to a server error.");
        }
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
        return Ok(new AuthResponseDto
        {
            Token = token,
            Role = user.Role,
            UserId = user.Id,
            FullName = user.FullName
        });
    }

    private string GenerateJwtToken(User user)
    {
        var jwt = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("userId", user.Id.ToString()),
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
