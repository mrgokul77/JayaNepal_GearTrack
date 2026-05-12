using System.Globalization;
using System.Text;
using backend.Data;
using backend.Models;
using backend.Options;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MimeKit;

namespace backend.Services;

public class EmailService : IEmailService
{
    public const string InvoiceNotFoundMessage = "Invoice not found.";
    public const string CustomerEmailMissingMessage = "Customer does not have an email address on file.";
    public const string SmtpNotConfiguredMessage =
        "Email is not configured. Set EmailSettings in appsettings.json (SMTP host, port, sender email, and app password).";

    private readonly ApplicationDbContext _db;
    private readonly EmailSettings _settings;

    public EmailService(ApplicationDbContext db, IOptions<EmailSettings> options)
    {
        _db = db;
        _settings = options.Value;
    }

    /// <inheritdoc />
    public async Task SendInvoiceEmailAsync(int invoiceId)
    {
        ValidateSmtpSettings();

        var invoice = await _db.SalesInvoices.AsNoTracking()
            .Include(s => s.Customer)
            .Include(s => s.Items)
            .ThenInclude(i => i.Part)
            .FirstOrDefaultAsync(s => s.Id == invoiceId);

        if (invoice is null)
        {
            throw new InvalidOperationException(InvoiceNotFoundMessage);
        }

        var toEmail = invoice.Customer.Email?.Trim();
        if (string.IsNullOrWhiteSpace(toEmail))
        {
            throw new InvalidOperationException(CustomerEmailMissingMessage);
        }

        var customerName = invoice.Customer.FullName.Trim();
        var body = BuildInvoiceBody(invoice, customerName);

        var message = new MimeMessage();
        message.From.Add(MailboxAddress.Parse(_settings.SenderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = $"GearTrack sales invoice #{invoice.Id}";

        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        await client.ConnectAsync(_settings.SmtpHost, _settings.SmtpPort, SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(_settings.SenderEmail, _settings.SenderPassword);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }

    private void ValidateSmtpSettings()
    {
        if (string.IsNullOrWhiteSpace(_settings.SmtpHost)
            || string.IsNullOrWhiteSpace(_settings.SenderEmail)
            || string.IsNullOrWhiteSpace(_settings.SenderPassword)
            || _settings.SmtpPort <= 0)
        {
            throw new InvalidOperationException(SmtpNotConfiguredMessage);
        }

        if (string.Equals(_settings.SenderPassword.Trim(), "your-app-password", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(SmtpNotConfiguredMessage);
        }
    }

    private static string BuildInvoiceBody(SalesInvoice invoice, string customerName)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Hello ").Append(customerName).AppendLine(",");
        sb.AppendLine();
        sb.AppendLine("Thank you for your purchase. Here is a summary of your sales invoice.");
        sb.AppendLine();
        sb.Append("Invoice #: ").AppendLine(invoice.Id.ToString(CultureInfo.InvariantCulture));
        sb.Append("Date: ").AppendLine(invoice.SaleDate.ToString("u", CultureInfo.InvariantCulture));
        sb.AppendLine();
        sb.AppendLine("Items:");
        sb.AppendLine(new string('-', 48));

        var items = (invoice.Items ?? []).OrderBy(i => i.Id).ToList();
        foreach (var line in items)
        {
            var name = line.Part?.Name ?? $"Part #{line.PartId}";
            var qty = line.Quantity.ToString(CultureInfo.InvariantCulture);
            var unit = FormatMoney(line.UnitPrice);
            var sub = FormatMoney(line.UnitPrice * line.Quantity);
            sb.Append("- ").Append(name);
            sb.Append(" | Qty ").Append(qty);
            sb.Append(" | Unit ").Append(unit);
            sb.Append(" | Line ").AppendLine(sub);
        }

        sb.AppendLine(new string('-', 48));
        sb.Append("Subtotal (before discount): ").AppendLine(FormatMoney(invoice.TotalAmount));
        if (invoice.DiscountApplied > 0)
        {
            sb.Append("Discount applied: ").AppendLine(FormatMoney(invoice.DiscountApplied));
        }
        else
        {
            sb.AppendLine("Discount applied: 0.00");
        }

        var due = invoice.TotalAmount - invoice.DiscountApplied;
        sb.Append("Amount due: ").AppendLine(FormatMoney(due));
        sb.AppendLine();
        sb.AppendLine("— GearTrack Vehicle Parts");

        return sb.ToString();
    }

    private static string FormatMoney(decimal value) =>
        value.ToString("N2", CultureInfo.InvariantCulture);
}
