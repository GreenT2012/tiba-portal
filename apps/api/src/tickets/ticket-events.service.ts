import { Injectable } from '@nestjs/common';
import type { TicketLifecycleEventContract } from '@tiba/shared/events';
import { OutboxService, type OutboxWriter } from '../outbox/outbox.service';

@Injectable()
export class TicketEventsService {
  constructor(private readonly outboxService: OutboxService) {}

  publish(event: TicketLifecycleEventContract, writer?: OutboxWriter) {
    const aggregateId = event.payload.ticketId;
    const customerId = event.payload.customerId;

    return this.outboxService.enqueue(
      {
        topic: event.topic,
        aggregateType: 'ticket',
        aggregateId,
        customerId,
        payloadJson: event.payload
      },
      writer
    );
  }
}
