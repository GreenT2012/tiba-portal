import { Injectable, Optional } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import type { TicketDto } from './tickets.types';

@Injectable()
export class TicketAssigneeService {
  constructor(@Optional() private readonly usersService?: UsersService) {}

  async enrich(ticket: TicketDto): Promise<TicketDto> {
    if (!ticket.assigneeUserId || !this.usersService) {
      return ticket;
    }

    try {
      ticket.assignee = await this.usersService.getUserById(ticket.assigneeUserId);
    } catch {
      ticket.assignee = null;
    }

    return ticket;
  }
}
