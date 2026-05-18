using Microsoft.Extensions.Configuration;

namespace backend.Options;

public class EmailSettings
{
    public const string SectionName = "EmailSettings";
    private const string PlaceholderPassword = "your-app-password";

    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SenderEmail { get; set; } = string.Empty;
    public string SenderPassword { get; set; } = string.Empty;

    /// <summary>Set during load when the raw config password contained whitespace (e.g. Gmail's spaced app password).</summary>
    public bool PasswordContainedWhitespace { get; private set; }

    /// <summary>True when all SMTP fields are present and not placeholder values.</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SmtpHost)
        && !string.IsNullOrWhiteSpace(SenderEmail)
        && !string.IsNullOrWhiteSpace(SenderPassword)
        && SmtpPort > 0
        && !string.Equals(SenderPassword.Trim(), PlaceholderPassword, StringComparison.Ordinal);

    /// <summary>Loads and normalizes SMTP settings from configuration (appsettings + environment).</summary>
    public static EmailSettings FromConfiguration(IConfiguration configuration)
    {
        var settings = configuration.GetSection(SectionName).Get<EmailSettings>() ?? new EmailSettings();
        settings.SmtpHost = settings.SmtpHost.Trim();
        settings.SenderEmail = settings.SenderEmail.Trim().ToLowerInvariant();

        var rawPassword = configuration[$"{SectionName}:SenderPassword"] ?? settings.SenderPassword;
        settings.PasswordContainedWhitespace = rawPassword.Any(char.IsWhiteSpace);
        settings.SenderPassword = NormalizeAppPassword(rawPassword);

        return settings;
    }

    /// <summary>Removes all whitespace (spaces, tabs, newlines) from Gmail-style app passwords.</summary>
    public static string NormalizeAppPassword(string? password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return string.Empty;
        }

        return new string(password.Where(c => !char.IsWhiteSpace(c)).ToArray());
    }
}
