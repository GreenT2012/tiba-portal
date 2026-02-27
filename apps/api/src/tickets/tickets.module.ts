import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, AuditService, StorageService]
})
export class TicketsModule {}
