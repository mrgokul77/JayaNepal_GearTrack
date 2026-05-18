using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace backend.Services;

/// <summary>
/// Background service that automatically runs low-stock checks and credit reminder emails on a daily schedule.
/// </summary>
public class NotificationSchedulerService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NotificationSchedulerService> _logger;
    private readonly TimeSpan _dailyRunTime;

    public NotificationSchedulerService(IServiceProvider serviceProvider, ILogger<NotificationSchedulerService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        // Default: run daily at 2:00 AM UTC
        _dailyRunTime = new TimeSpan(2, 0, 0);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("NotificationSchedulerService started. Scheduled to run daily at {Time} UTC.", _dailyRunTime);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;
                var nextRun = GetNextRunTime(now);
                var delayUntilNextRun = nextRun - now;

                _logger.LogInformation("Next notification run scheduled for {NextRun} UTC (in {Delay}).", nextRun, delayUntilNextRun);

                await Task.Delay(delayUntilNextRun, stoppingToken);

                if (stoppingToken.IsCancellationRequested)
                {
                    break;
                }

                await RunNotificationChecksAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("NotificationSchedulerService is shutting down.");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred in NotificationSchedulerService.");
                // Wait a bit before retrying to avoid tight error loops
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }

    private async Task RunNotificationChecksAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting daily notification checks at {Time} UTC.", DateTime.UtcNow);

        await using var scope = _serviceProvider.CreateAsyncScope();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        try
        {
            // Run low-stock check
            var stockResult = await notificationService.CheckLowStockAsync(cancellationToken);
            _logger.LogInformation("Low-stock check completed. {Count} notifications created.", stockResult.NotificationsCreated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Low-stock check failed.");
        }

        try
        {
            // Run credit reminder sweep
            var creditResult = await notificationService.SendCreditRemindersAsync(cancellationToken);
            _logger.LogInformation("Credit reminder sweep completed. {Sent} emails sent, {Skipped} skipped/failed.",
                creditResult.EmailsSent, creditResult.SkippedOrFailed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Credit reminder sweep failed.");
        }

        _logger.LogInformation("Daily notification checks completed at {Time} UTC.", DateTime.UtcNow);
    }

    private DateTime GetNextRunTime(DateTime now)
    {
        var nextRun = now.Date.Add(_dailyRunTime);

        // If the scheduled time has already passed today, schedule for tomorrow
        if (nextRun <= now)
        {
            nextRun = nextRun.AddDays(1);
        }

        return nextRun;
    }
}
