using backend.DTOs;

namespace backend.Services;

/// <summary>
/// Feature 15: low-stock admin alerts and customer credit reminder emails.
/// </summary>
public interface INotificationService
{
    /// <summary>Creates unread low-stock notifications for each admin when stock is below threshold.</summary>
    Task<LowStockCheckResultDto> CheckLowStockAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Emails customers who have sales invoices older than 30 days with a positive discount (outstanding credit context).
    /// </summary>
    Task<CreditReminderSweepResultDto> SendCreditRemindersAsync(CancellationToken cancellationToken = default);

    /// <summary>Lists notifications for the given admin user, newest first.</summary>
    Task<List<NotificationResponseDto>> GetAdminNotificationsAsync(int adminId, CancellationToken cancellationToken = default);

    /// <summary>Marks a notification read if it belongs to the given admin.</summary>
    Task<bool> MarkAsReadAsync(int notificationId, int adminId, CancellationToken cancellationToken = default);
}
