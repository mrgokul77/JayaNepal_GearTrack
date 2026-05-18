namespace backend.DTOs;

public class CreateServiceReviewDto
{
    public int Rating { get; set; }
    public string? Comment { get; set; }
}

public class ServiceReviewResponseDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}
