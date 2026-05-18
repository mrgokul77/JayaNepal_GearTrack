using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace backend.Services;

/// <summary>
/// Implements Feature 15: low-stock admin notifications and customer credit reminder emails.
/// </summary>
public class NotificationService : INotificationService
{
    public const string LowStockType = "LowStock";
    public const string CreditReminderType = "CreditReminder";

    private const int LowStockThreshold = 10;
    private const int CreditReminderMinAgeDays = 30;

    private readonly ApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        ApplicationDbContext db,
        IEmailService emailService,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<LowStockCheckResultDto> CheckLowStockAsync(CancellationToken cancellationToken = default)
    {
        var adminIds = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "Admin")
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        if (adminIds.Count == 0)
        {
            _logger.LogWarning("Low stock check skipped: no Admin users exist.");
            return new LowStockCheckResultDto { NotificationsCreated = 0 };
        }

        var lowParts = await _db.VehicleParts.AsNoTracking()
            .Where(p => p.StockQuantity < LowStockThreshold)
            .ToListAsync(cancellationToken);

        var created = 0;

        foreach (var part in lowParts)
        {
            var message = $"{part.Name} has only {part.StockQuantity} units left";

            foreach (var adminId in adminIds)
            {
                var alreadyOpen = await _db.Notifications.AnyAsync(
                    n => n.AdminId == adminId
                         && !n.IsRead
                         && n.Type == LowStockType
                         && n.VehiclePartId == part.Id,
                    cancellationToken);

                if (alreadyOpen)
                {
                    continue;
                }

                _db.Notifications.Add(new Notification
                {
                    Title = "Low Stock Alert",
                    Message = message,
                    Type = LowStockType,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    AdminId = adminId,
                    VehiclePartId = part.Id,
                });
                created++;
            }
        }

        if (created > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return new LowStockCheckResultDto { NotificationsCreated = created };
    }

    /// <inheritdoc />
    public async Task<CreditReminderSweepResultDto> SendCreditRemindersAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-CreditReminderMinAgeDays);

        var invoices = await _db.SalesInvoices.AsNoTracking()
            .Include(s => s.Customer)
            .Where(s => s.DiscountApplied > 0 && s.SaleDate < cutoff)
            .ToListAsync(cancellationToken);

        var byCustomer = invoices.GroupBy(s => s.CustomerId).ToList();
        var emailsSent = 0;
        var skippedOrFailed = 0;

        foreach (var group in byCustomer)
        {
            var first = group.First();
            var email = first.Customer.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                _logger.LogInformation("Credit reminder skipped for customer {CustomerId}: no email on file.", first.CustomerId);
                skippedOrFailed++;
                continue;
            }

            var lines = group
                .Select(s => new CreditReminderLine
                {
                    InvoiceId = s.Id,
                    SaleDate = s.SaleDate,
                    DiscountApplied = s.DiscountApplied,
                    TotalAmount = s.TotalAmount,
                })
                .ToList();

            try
            {
                await _emailService.SendCreditReminderEmailAsync(
                    email,
                    first.Customer.FullName,
                    lines,
                    cancellationToken);
                emailsSent++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send credit reminder to {Email}", email);
                skippedOrFailed++;
            }
        }

        return new CreditReminderSweepResultDto
        {
            EmailsSent = emailsSent,
            SkippedOrFailed = skippedOrFailed,
        };
    }

    /// <inheritdoc />
    public async Task<List<NotificationResponseDto>> GetAdminNotificationsAsync(int adminId, CancellationToken cancellationToken = default)
    {
        return await _db.Notifications.AsNoTracking()
            .Where(n => n.AdminId == adminId)
            .OrderByDescending(n => n.CreatedAt)
            .ThenByDescending(n => n.Id)
            .Select(n => new NotificationResponseDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
            })
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> MarkAsReadAsync(int notificationId, int adminId, CancellationToken cancellationToken = default)
    {
        var row = await _db.Notifications.FirstOrDefaultAsync(
            n => n.Id == notificationId && n.AdminId == adminId,
            cancellationToken);

        if (row is null)
        {
            return false;
        }

        if (!row.IsRead)
        {
            row.IsRead = true;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}
