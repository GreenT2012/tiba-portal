import { Module } from '@nestjs/common';
import { OutboxController } from './outbox.controller';
import { OUTBOX_EVENT_HANDLERS } from './outbox.constants';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxRunnerService } from './outbox-runner.service';
import { OutboxService } from './outbox.service';
import { TicketOutboxEventsHandler } from './outbox-ticket-events.handler';

@Module({
  controllers: [OutboxController],
  providers: [
    OutboxService,
    OutboxDispatcherService,
    OutboxRunnerService,
    TicketOutboxEventsHandler,
    {
      provide: OUTBOX_EVENT_HANDLERS,
      useFactory: (ticketHandler: TicketOutboxEventsHandler) => [ticketHandler],
      inject: [TicketOutboxEventsHandler]
    }
  ],
  exports: [OutboxService, OutboxDispatcherService, OUTBOX_EVENT_HANDLERS]
})
export class OutboxModule {}
