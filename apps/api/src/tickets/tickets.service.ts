import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(user: AuthUser, dto: CreateTicketDto) {
    const status = dto.status ?? 'OPEN';

    if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) {
      throw new BadRequestException('status must be one of: OPEN, IN_PROGRESS, CLOSED');
    }

    return this.prisma.ticket.create({
      data: {
        customer_id: dto.customerId ?? user.customerId ?? '',
        project_id: dto.projectId,
        type: dto.type,
        status,
        title: dto.title,
        description: dto.description,
        assignee_user_id: dto.assigneeUserId ?? null,
        created_by_user_id: user.sub
      }
    });
  }
}
