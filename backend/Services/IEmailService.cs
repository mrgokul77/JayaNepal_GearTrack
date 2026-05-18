namespace backend.Services;

public interface IEmailService
{
    Task SendInvoiceEmailAsync(int invoiceId);

    /// <summary>Sends a plain-text reminder about outstanding invoice credit/discount balances.</summary>
    Task SendCreditReminderEmailAsync(string toEmail, string customerName, IReadOnlyList<CreditReminderLine> lines, CancellationToken cancellationToken = default);
}

/// <summary>One sales line item referenced in a credit reminder email.</summary>
public sealed class CreditReminderLine
{
    public int InvoiceId { get; init; }
    public DateTime SaleDate { get; init; }
    public decimal DiscountApplied { get; init; }
    public decimal TotalAmount { get; init; }
}
