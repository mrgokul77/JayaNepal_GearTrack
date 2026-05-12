namespace backend.Services;

public interface IEmailService
{
    Task SendInvoiceEmailAsync(int invoiceId);
}
