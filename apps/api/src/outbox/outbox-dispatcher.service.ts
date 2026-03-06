import { Inject, Injectable } from '@nestjs/common';
import { OUTBOX_EVENT_HANDLERS } from './outbox.constants';
import type { OutboxEventHandler } from './outbox-handler.interface';
import { OutboxService } from './outbox.service';
import type { OutboxDispatchSummary, OutboxStats } from './outbox.types';

@Injectable()
export class OutboxDispatcherService {
  constructor(
    private readonly outboxService: OutboxService,
    @Inject(OUTBOX_EVENT_HANDLERS) private readonly handlers: OutboxEventHandler[]
  ) {}

  async dispatchPending(batchSize = this.getBatchSize()): Promise<OutboxDispatchSummary> {
    const maxAttempts = this.getMaxAttempts();
    const retryDelayMs = this.getRetryDelayMs();
    const events = await this.outboxService.listProcessable(batchSize, maxAttempts);
    const summary: OutboxDispatchSummary = {
      requested: batchSize,
      claimed: 0,
      processed: 0,
      failed: 0,
      exhausted: 0,
      skipped: 0
    };

    for (const event of events) {
      const claimed = await this.outboxService.claimForProcessing(event.id);
      if (!claimed) {
        summary.skipped += 1;
        continue;
      }

      summary.claimed += 1;

      try {
        const handler = this.handlers.find((candidate) => candidate.supports(event.topic));
        if (!handler) {
          throw new Error(`No outbox handler registered for topic ${event.topic}`);
        }

        await handler.handle(event);
        await this.outboxService.markProcessed(event.id);
        summary.processed += 1;
      } catch (error) {
        const nextAttempts = event.attempts + 1;
        const exhausted = nextAttempts >= maxAttempts;
        const nextRetryAt = exhausted ? null : new Date(Date.now() + retryDelayMs);
        await this.outboxService.markFailed(
          event.id,
          error instanceof Error ? error.message : 'Outbox handler failed',
          nextRetryAt
        );
        summary.failed += 1;
        if (exhausted) {
          summary.exhausted += 1;
        }
      }
    }

    return summary;
  }

  getStats(): Promise<OutboxStats> {
    return this.outboxService.getStats(this.getMaxAttempts());
  }

  getBatchSize() {
    return this.readPositiveInt(process.env.OUTBOX_DISPATCH_BATCH_SIZE, 20);
  }

  getMaxAttempts() {
    return this.readPositiveInt(process.env.OUTBOX_MAX_ATTEMPTS, 5);
  }

  getRetryDelayMs() {
    return this.readPositiveInt(process.env.OUTBOX_RETRY_DELAY_MS, 30_000);
  }

  private readPositiveInt(raw: string | undefined, fallback: number) {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
