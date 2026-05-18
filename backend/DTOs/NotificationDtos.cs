namespace backend.DTOs;

/// <summary>API shape for listing admin notifications.</summary>
public class NotificationResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Result of a manual credit-reminder email sweep.</summary>
public class CreditReminderSweepResultDto
{
    /// <summary>Distinct customers that received at least one email.</summary>
    public int EmailsSent { get; set; }
    /// <summary>Customers skipped (missing email or SMTP failure after retries).</summary>
    public int SkippedOrFailed { get; set; }
}

/// <summary>Result of a manual low-stock notification sweep.</summary>
public class LowStockCheckResultDto
{
    public int NotificationsCreated { get; set; }
}
