namespace backend.Services;

/// <summary>
/// Sends transactional emails (e.g. sales invoices to customers).
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Loads the invoice, builds the message, and sends via SMTP. Returns <c>false</c> if sending is skipped or fails.
    /// </summary>
    Task<bool> SendInvoiceEmailAsync(int invoiceId);
}
