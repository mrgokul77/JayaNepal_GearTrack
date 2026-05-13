using System.Globalization;
using System.Net;
using backend.Data;
using backend.Models;
using backend.Options;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace backend.Services;

/// <summary>
/// MailKit-based SMTP sender for sales invoice notifications.
/// </summary>
public class EmailService : IEmailService
{
    private static readonly string[] PlaceholderPasswords =
    [
        "your-app-password",
        "app-password-here",
    ];

    private readonly ApplicationDbContext _db;
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        ApplicationDbContext db,
        IOptions<EmailSettings> options,
        ILogger<EmailService> logger)
    {
        _db = db;
        _settings = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<bool> SendInvoiceEmailAsync(int invoiceId)
    {
        if (!IsSmtpConfigured())
        {
            _logger.LogWarning("SendInvoiceEmailAsync skipped: SMTP settings are missing or still use a placeholder password.");
            return false;
        }

        try
        {
            var invoice = await _db.SalesInvoices.AsNoTracking()
                .Include(s => s.Customer)
                .Include(s => s.Items)
                .ThenInclude(i => i.Part)
                .FirstOrDefaultAsync(s => s.Id == invoiceId);

            if (invoice is null)
            {
                _logger.LogWarning("SendInvoiceEmailAsync: invoice {InvoiceId} not found.", invoiceId);
                return false;
            }

            var toEmail = invoice.Customer.Email?.Trim();
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("SendInvoiceEmailAsync: customer {CustomerId} has no email.", invoice.CustomerId);
                return false;
            }

            var customerName = invoice.Customer.FullName.Trim();
            var html = BuildInvoiceHtml(invoice, customerName);
            var senderName = string.IsNullOrWhiteSpace(_settings.SenderName)
                ? "GearTrack"
                : _settings.SenderName.Trim();

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderName, _settings.SenderEmail.Trim()));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = $"GearTrack — Sales invoice #{invoice.Id}";

            var body = new BodyBuilder { HtmlBody = html };
            message.Body = body.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(_settings.SmtpHost.Trim(), _settings.SmtpPort, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_settings.SenderEmail.Trim(), _settings.SenderPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Invoice {InvoiceId} emailed to {Recipient}.", invoiceId, toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SendInvoiceEmailAsync failed for invoice {InvoiceId}.", invoiceId);
            return false;
        }
    }

    /// <summary>True when host, port, credentials are present and password is not a documented placeholder.</summary>
    private bool IsSmtpConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.SmtpHost)
            || string.IsNullOrWhiteSpace(_settings.SenderEmail)
            || string.IsNullOrWhiteSpace(_settings.SenderPassword)
            || _settings.SmtpPort <= 0)
        {
            return false;
        }

        var pwd = _settings.SenderPassword.Trim();
        if (PlaceholderPasswords.Contains(pwd, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    /// <summary>Builds a simple HTML body: customer, invoice meta, line table, totals.</summary>
    private static string BuildInvoiceHtml(SalesInvoice invoice, string customerName)
    {
        var safeName = WebUtility.HtmlEncode(customerName);
        var items = (invoice.Items ?? []).OrderBy(i => i.Id).ToList();
        var rows = new System.Text.StringBuilder();
        foreach (var line in items)
        {
            var name = WebUtility.HtmlEncode(line.Part?.Name ?? $"Part #{line.PartId}");
            var qty = line.Quantity.ToString(CultureInfo.InvariantCulture);
            var unit = FormatMoney(line.UnitPrice);
            rows.Append("<tr>")
                .Append("<td style=\"padding:8px;border:1px solid #e5e7eb;\">").Append(name).Append("</td>")
                .Append("<td style=\"padding:8px;border:1px solid #e5e7eb;text-align:right;\">").Append(qty).Append("</td>")
                .Append("<td style=\"padding:8px;border:1px solid #e5e7eb;text-align:right;\">").Append(unit).Append("</td>")
                .Append("</tr>");
        }

        var total = FormatMoney(invoice.TotalAmount);
        var discount = FormatMoney(invoice.DiscountApplied);
        var due = FormatMoney(invoice.TotalAmount - invoice.DiscountApplied);
        var discountRow = invoice.DiscountApplied > 0
            ? $"<tr><td colspan=\"2\" style=\"padding:8px;text-align:right;font-weight:600;\">Discount applied</td><td style=\"padding:8px;text-align:right;\">{discount}</td></tr>"
            : string.Empty;

        return $"""
            <html><body style="font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:14px;color:#111827;">
            <p>Hello {safeName},</p>
            <p>Thank you for your purchase. Below is a summary of your sales invoice.</p>
            <p><strong>Invoice ID:</strong> {invoice.Id}<br/>
            <strong>Date:</strong> {WebUtility.HtmlEncode(invoice.SaleDate.ToString("u", CultureInfo.InvariantCulture))}</p>
            <table style="border-collapse:collapse;width:100%;max-width:560px;margin:16px 0;">
            <thead><tr>
            <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;">Part</th>
            <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:right;">Qty</th>
            <th style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:right;">Price</th>
            </tr></thead>
            <tbody>{rows}</tbody>
            </table>
            <table style="border-collapse:collapse;max-width:360px;">
            <tr><td style="padding:6px 8px;font-weight:600;">Total amount</td><td style="padding:6px 8px;text-align:right;">{total}</td></tr>
            {discountRow}
            <tr><td style="padding:6px 8px;font-weight:700;">Amount due</td><td style="padding:6px 8px;text-align:right;font-weight:700;">{due}</td></tr>
            </table>
            <p style="margin-top:24px;color:#6b7280;font-size:12px;">— GearTrack Vehicle Parts</p>
            </body></html>
            """;
    }

    private static string FormatMoney(decimal value) =>
        WebUtility.HtmlEncode(value.ToString("N2", CultureInfo.InvariantCulture));
}
