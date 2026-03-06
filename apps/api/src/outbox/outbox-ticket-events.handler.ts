import { Injectable, Logger } from '@nestjs/common';
import { ticketLifecycleEventSchema } from '@tiba/shared/events';
import type { OutboxEventHandler } from './outbox-handler.interface';
import type { DispatchableOutboxEvent } from './outbox.types';

@Injectable()
export class TicketOutboxEventsHandler implements OutboxEventHandler {
  private readonly logger = new Logger(TicketOutboxEventsHandler.name);

  supports(topic: string): boolean {
    return topic.startsWith('ticket.');
  }

  async handle(event: DispatchableOutboxEvent): Promise<void> {
    const parsed = ticketLifecycleEventSchema.safeParse({
      topic: event.topic,
      payload: event.payload
    });

    if (!parsed.success) {
      throw new Error(`Invalid ticket lifecycle payload for topic ${event.topic}`);
    }

    this.logger.debug(`Processed outbox event ${event.id} (${parsed.data.topic}) for aggregate ${event.aggregateId}`);
  }
}
