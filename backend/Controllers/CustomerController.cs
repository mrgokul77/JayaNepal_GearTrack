using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Customer registration and vehicle management for staff and administrators.
/// </summary>
[ApiController]
[Route("api/customers")]
[Authorize(Roles = "Admin,Staff")]
public class CustomerController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomerController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    /// <summary>Registers a new customer user and profile (no vehicle).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerResponseDto>> Create([FromBody] CreateCustomerDto dto)
    {
        try
        {
            var created = await _customerService.CreateCustomerAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    /// <summary>Adds a vehicle to an existing customer.</summary>
    [HttpPost("{id:int}/vehicles")]
    [ProducesResponseType(typeof(VehicleResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleResponseDto>> AddVehicle(int id, [FromBody] CreateVehicleDto dto)
    {
        try
        {
            var vehicle = await _customerService.AddVehicleAsync(id, dto);
            return CreatedAtAction(nameof(GetById), new { id }, vehicle);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException)
        {
            return NotFound("Customer not found.");
        }
    }

    /// <summary>Lists all customers and their vehicles.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<CustomerResponseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CustomerResponseDto>>> GetAll()
    {
        var list = await _customerService.GetAllCustomersAsync();
        return Ok(list);
    }

    /// <summary>Staff/admin search by customer name, phone, email, id, or vehicle number (case-insensitive).</summary>
    /// <remarks>Declared before <c>GET /{id}</c> so <c>search</c> is not captured as an integer route value.</remarks>
    [HttpGet("search")]
    [ProducesResponseType(typeof(List<CustomerResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<CustomerResponseDto>>> Search([FromQuery] string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest("A non-empty search query is required.");
        }

        try
        {
            var results = await _customerService.SearchCustomersAsync(query);
            return Ok(results);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Gets a single customer by id, including vehicles.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CustomerResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerResponseDto>> GetById(int id)
    {
        var customer = await _customerService.GetCustomerByIdAsync(id);
        if (customer is null)
        {
            return NotFound();
        }

        return Ok(customer);
    }
}
