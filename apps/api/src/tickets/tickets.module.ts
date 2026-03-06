import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { OutboxModule } from '../outbox/outbox.module';
import { StorageService } from '../storage/storage.service';
import { UsersModule } from '../users/users.module';
import { TicketAssigneeService } from './ticket-assignee.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketEventsService } from './ticket-events.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [UsersModule, OutboxModule],
  controllers: [TicketsController],
  providers: [TicketsService, AuditService, StorageService, TicketAttachmentsService, TicketAssigneeService, TicketEventsService]
})
export class TicketsModule {}
