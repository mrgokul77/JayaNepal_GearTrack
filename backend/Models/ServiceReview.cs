namespace backend.Models;

/// <summary>
/// Customer review of workshop or service quality (1–5 stars).
/// </summary>
public class ServiceReview
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public int? AppointmentId { get; set; }
    /// <summary>Rating from 1 to 5 inclusive.</summary>
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Customer Customer { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}
