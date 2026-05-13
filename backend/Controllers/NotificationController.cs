using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.DTOs;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>Admin notifications and manual system checks (Feature 15).</summary>
[ApiController]
[Route("api/notifications")]
[Authorize(Roles = "Admin")]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>Lists all notifications for the signed-in admin (read and unread).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<NotificationResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<NotificationResponseDto>>> GetAll()
    {
        var adminId = ResolveAdminUserId();
        if (adminId is null)
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var list = await _notificationService.GetAdminNotificationsAsync(adminId.Value);
        return Ok(list);
    }

    /// <summary>Marks a notification as read if it belongs to the current admin.</summary>
    [HttpPut("{id:int}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkRead(int id)
    {
        var adminId = ResolveAdminUserId();
        if (adminId is null)
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var ok = await _notificationService.MarkAsReadAsync(id, adminId.Value);
        if (!ok)
        {
            return NotFound("Notification not found.");
        }

        return NoContent();
    }

    /// <summary>Runs the low-stock scan and creates unread admin notifications where needed.</summary>
    [HttpPost("check-low-stock")]
    [ProducesResponseType(typeof(LowStockCheckResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LowStockCheckResultDto>> CheckLowStock()
    {
        if (ResolveAdminUserId() is null)
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var result = await _notificationService.CheckLowStockAsync();
        return Ok(result);
    }

    /// <summary>Sends credit reminder emails to eligible customers (invoices &gt; 30 days with discount applied).</summary>
    [HttpPost("send-credit-reminders")]
    [ProducesResponseType(typeof(CreditReminderSweepResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CreditReminderSweepResultDto>> SendCreditReminders()
    {
        if (ResolveAdminUserId() is null)
        {
            return Unauthorized("Missing or invalid user id in token.");
        }

        var result = await _notificationService.SendCreditRemindersAsync();
        return Ok(result);
    }

    private int? ResolveAdminUserId()
    {
        var sub =
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(sub, out var id) ? id : null;
    }
}
