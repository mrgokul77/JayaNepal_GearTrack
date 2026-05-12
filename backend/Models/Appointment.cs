namespace backend.Models;

/// <summary>
/// Customer service appointment booking.
/// </summary>
public class Appointment
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    /// <summary>One of: Pending, Confirmed, Cancelled.</summary>
    public string Status { get; set; } = "Pending";
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Customer Customer { get; set; } = null!;
}
