namespace backend.Models;

/// <summary>
/// In-app alert for administrators (low stock, etc.).
/// </summary>
public class Notification
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    /// <summary>LowStock or CreditReminder (reserved for future in-app credit alerts).</summary>
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Admin user (<see cref="User.Id"/>) who receives this notification.</summary>
    public int AdminId { get; set; }
    public User Admin { get; set; } = null!;

    /// <summary>
    /// When <see cref="Type"/> is low stock, identifies the catalog row so we do not duplicate unread alerts for the same part.
    /// </summary>
    public int? VehiclePartId { get; set; }
    public VehiclePart? VehiclePart { get; set; }
}
