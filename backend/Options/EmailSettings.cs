namespace backend.Options;

/// <summary>
/// SMTP and sender identity for outbound mail (see <c>appsettings.json</c> → <c>EmailSettings</c>).
/// </summary>
public class EmailSettings
{
    public const string SectionName = "EmailSettings";

    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderPassword { get; set; } = string.Empty;
    /// <summary>Display name shown in the recipient's mail client (e.g. "GearTrack System").</summary>
    public string SenderName { get; set; } = string.Empty;
}
