namespace backend.Models;

/// <summary>
/// Customer request for a part that is unavailable or not in catalog.
/// </summary>
public class PartRequest
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>One of: Pending, Fulfilled.</summary>
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Customer Customer { get; set; } = null!;
}
