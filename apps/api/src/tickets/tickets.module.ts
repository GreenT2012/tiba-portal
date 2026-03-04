import { Module } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { UsersModule } from '../users/users.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [UsersModule],
  controllers: [TicketsController],
  providers: [TicketsService, AuditService, StorageService]
})
export class TicketsModule {}
