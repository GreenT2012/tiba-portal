import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Injectable()
export class OutboxRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRunnerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly outboxDispatcherService: OutboxDispatcherService) {}

  onModuleInit() {
    if (!this.isAutoDispatchEnabled()) {
      this.logger.log('Automatic outbox dispatch is disabled');
      return;
    }

    const intervalMs = this.getPollIntervalMs();
    this.logger.log(`Automatic outbox dispatch enabled (interval=${intervalMs}ms)`);

    void this.runCycle('startup');
    this.timer = setInterval(() => {
      void this.runCycle('interval');
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runCycle(trigger: 'startup' | 'interval') {
    if (this.running) {
      this.logger.warn(`Skipping outbox dispatch cycle (${trigger}) because a previous cycle is still running`);
      return;
    }

    this.running = true;

    try {
      const summary = await this.outboxDispatcherService.dispatchPending();
      if (summary.claimed > 0 || summary.failed > 0 || summary.skipped > 0) {
        this.logger.log(
          `Outbox dispatch (${trigger}) claimed=${summary.claimed} processed=${summary.processed} failed=${summary.failed} exhausted=${summary.exhausted} skipped=${summary.skipped}`
        );
      }

      const stats = await this.outboxDispatcherService.getStats();
      if (stats.failed > 0) {
        const topics = stats.failedByTopic.map((entry) => `${entry.topic}:${entry.count}`).join(', ');
        this.logger.warn(
          `Outbox failed backlog retryable=${stats.retryableFailed} exhausted=${stats.exhaustedFailed}${topics ? ` topics=[${topics}]` : ''}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Outbox dispatch cycle (${trigger}) failed`,
        error instanceof Error ? error.stack : String(error)
      );
    } finally {
      this.running = false;
    }
  }

  private isAutoDispatchEnabled() {
    return (process.env.OUTBOX_AUTO_DISPATCH ?? 'true').toLowerCase() !== 'false';
  }

  private getPollIntervalMs() {
    const parsed = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5000);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 5000;
  }
}
