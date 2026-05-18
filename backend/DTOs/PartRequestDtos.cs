namespace backend.DTOs;

public class CreatePartRequestDto
{
    public string PartName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class PartRequestResponseDto
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string? CustomerName { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
