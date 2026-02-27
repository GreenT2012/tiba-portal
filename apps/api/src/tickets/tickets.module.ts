import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, AuditService]
})
export class TicketsModule {}
