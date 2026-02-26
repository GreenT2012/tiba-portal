import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { TICKET_STATUSES, TICKET_TYPES, TicketSummary } from './tickets.types';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(user: AuthUser, query: ListTicketsDto) {
    this.validateListQuery(query);

    const page = this.parsePositiveInt(query.page, 1, 'page');
    const pageSize = this.parsePositiveInt(query.pageSize, 20, 'pageSize', 100);
    const orderByField = query.sort === 'createdAt' ? 'created_at' : 'updated_at';
    const orderDirection = query.order === 'asc' ? 'asc' : 'desc';

    const where = await this.buildTicketWhere(user, query);

    const db = this.prisma.db;
    const [items, total] = await db.$transaction([
      db.ticket.findMany({
        where,
        orderBy: { [orderByField]: orderDirection },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.ticket.count({ where })
    ]);

    return {
      items: items.map((ticket: any): TicketSummary => this.toTicketSummary(ticket)),
      page,
      pageSize,
      total
    };
  }

  async createTicket(user: AuthUser, payload: CreateTicketDto) {
    this.validateCreateTicketPayload(payload);

    const isCustomerUser = this.isCustomerUser(user);
    const isInternalUser = this.isInternalUser(user);

    if (!isCustomerUser && !isInternalUser) {
      throw new ForbiddenException('Unsupported role for ticket creation');
    }

    let customerId: string;

    if (isCustomerUser) {
      if (!user.customerId) {
        throw new ForbiddenException('customer_id claim is required for customer_user');
      }
      if (payload.customerId) {
        throw new BadRequestException('customerId cannot be set by customer_user');
      }
      if (payload.assigneeUserId) {
        throw new BadRequestException('assigneeUserId cannot be set by customer_user');
      }
      customerId = user.customerId;
    } else {
      if (!payload.customerId) {
        throw new BadRequestException('customerId is required for internal ticket creation');
      }
      customerId = payload.customerId;
    }

    const db = this.prisma.db;
    const project = await db.project.findFirst({
      where: { id: payload.projectId, customer_id: customerId }
    });

    if (!project) {
      throw new BadRequestException('Project not found for customer');
    }

    return db.$transaction(async (tx: any) => {
      const ticket = await tx.ticket.create({
        data: {
          customer_id: customerId,
          project_id: payload.projectId,
          type: payload.type,
          status: payload.status,
          title: payload.title,
          description: payload.description,
          assignee_user_id: payload.assigneeUserId ?? null,
          created_by_user_id: user.sub
        }
      });

      await tx.auditLog.create({
        data: {
          customer_id: customerId,
          entity_type: 'ticket',
          entity_id: ticket.id,
          action: 'created',
          actor_user_id: user.sub,
          meta_json: {
            type: payload.type,
            status: payload.status,
            projectId: payload.projectId
          }
        }
      });

      return this.getTicketById(user, ticket.id);
    });
  }

  async getTicketById(user: AuthUser, ticketId: string) {
    const db = this.prisma.db;
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      include: {
        comments: {
          orderBy: { created_at: 'asc' }
        },
        attachments: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    this.assertTicketAccess(user, ticket);

    return {
      id: ticket.id,
      customerId: ticket.customer_id,
      projectId: ticket.project_id,
      type: ticket.type,
      status: ticket.status,
      title: ticket.title,
      description: ticket.description,
      assigneeUserId: ticket.assignee_user_id,
      createdByUserId: ticket.created_by_user_id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      comments: ticket.comments.map((comment: any) => ({
        id: comment.id,
        ticketId: comment.ticket_id,
        customerId: comment.customer_id,
        authorUserId: comment.author_user_id,
        body: comment.body,
        createdAt: comment.created_at
      })),
      attachments: ticket.attachments.map((attachment: any) => ({
        id: attachment.id,
        ticketId: attachment.ticket_id,
        customerId: attachment.customer_id,
        filename: attachment.filename,
        mime: attachment.mime,
        sizeBytes: attachment.size_bytes,
        objectKey: attachment.object_key,
        uploadedByUserId: attachment.uploaded_by_user_id,
        createdAt: attachment.created_at
      }))
    };
  }

  async updateTicketStatus(user: AuthUser, ticketId: string, payload: UpdateTicketStatusDto) {
    if (!TICKET_STATUSES.includes(payload.status as (typeof TICKET_STATUSES)[number])) {
      throw new BadRequestException(`status must be one of: ${TICKET_STATUSES.join(', ')}`);
    }

    const db = this.prisma.db;
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    this.assertTicketAccess(user, ticket);

    return db.$transaction(async (tx: any) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: payload.status
        }
      });

      await tx.auditLog.create({
        data: {
          customer_id: updated.customer_id,
          entity_type: 'ticket',
          entity_id: updated.id,
          action: 'status_changed',
          actor_user_id: user.sub,
          meta_json: {
            from: ticket.status,
            to: payload.status
          }
        }
      });

      return this.getTicketById(user, updated.id);
    });
  }

  async assignTicket(user: AuthUser, ticketId: string, payload: AssignTicketDto) {
    if (!this.isInternalUser(user)) {
      throw new ForbiddenException('Only internal users can assign tickets');
    }

    if (!Object.prototype.hasOwnProperty.call(payload, 'assigneeUserId')) {
      throw new BadRequestException('assigneeUserId must be provided');
    }
    if (payload.assigneeUserId !== null && payload.assigneeUserId !== undefined && typeof payload.assigneeUserId !== 'string') {
      throw new BadRequestException('assigneeUserId must be string or null');
    }

    const db = this.prisma.db;
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    this.assertTicketAccess(user, ticket);

    const nextAssignee = payload.assigneeUserId ?? null;

    return db.$transaction(async (tx: any) => {
      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          assignee_user_id: nextAssignee
        }
      });

      await tx.auditLog.create({
        data: {
          customer_id: updated.customer_id,
          entity_type: 'ticket',
          entity_id: updated.id,
          action: 'assigned',
          actor_user_id: user.sub,
          meta_json: {
            from: ticket.assignee_user_id,
            to: nextAssignee
          }
        }
      });

      return this.getTicketById(user, updated.id);
    });
  }

  async addComment(user: AuthUser, ticketId: string, payload: CreateTicketCommentDto) {
    if (!payload.body || payload.body.trim().length === 0) {
      throw new BadRequestException('body is required');
    }

    const db = this.prisma.db;
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    this.assertTicketAccess(user, ticket);

    return db.$transaction(async (tx: any) => {
      const comment = await tx.ticketComment.create({
        data: {
          ticket_id: ticket.id,
          customer_id: ticket.customer_id,
          author_user_id: user.sub,
          body: payload.body
        }
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updated_at: new Date() }
      });

      await tx.auditLog.create({
        data: {
          customer_id: ticket.customer_id,
          entity_type: 'ticket',
          entity_id: ticket.id,
          action: 'comment_added',
          actor_user_id: user.sub,
          meta_json: {
            commentId: comment.id
          }
        }
      });

      return {
        id: comment.id,
        ticketId: comment.ticket_id,
        customerId: comment.customer_id,
        authorUserId: comment.author_user_id,
        body: comment.body,
        createdAt: comment.created_at
      };
    });
  }

  private async buildTicketWhere(user: AuthUser, query: ListTicketsDto) {
    const isCustomerUser = this.isCustomerUser(user);

    if (isCustomerUser && query.customerId) {
      throw new ForbiddenException('customerId query filter is not allowed for customer_user');
    }

    const customerId = isCustomerUser ? user.customerId : query.customerId;
    if (isCustomerUser && !customerId) {
      throw new ForbiddenException('customer_id claim is required for customer_user');
    }

    const where: Record<string, unknown> = {};

    if (customerId) {
      where.customer_id = customerId;
    }

    if (query.projectId) {
      where.project_id = query.projectId;
    }

    if (query.view === 'new') {
      where.status = 'OPEN';
      where.assignee_user_id = null;
    } else if (query.view === 'open') {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    } else if (query.view === 'my') {
      where.assignee_user_id = user.sub;
      where.status = { not: 'CLOSED' };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignee === 'me') {
      where.assignee_user_id = user.sub;
    } else if (query.assignee === 'unassigned') {
      where.assignee_user_id = null;
    }

    return where;
  }

  private assertTicketAccess<T extends { customer_id: string; id: string }>(
    user: AuthUser,
    ticket: T | null
  ): asserts ticket is T {
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (this.isCustomerUser(user) && user.customerId !== ticket.customer_id) {
      throw new NotFoundException('Ticket not found');
    }
  }

  private isCustomerUser(user: AuthUser) {
    return user.roles.includes('customer_user');
  }

  private isInternalUser(user: AuthUser) {
    return user.roles.includes('tiba_agent') || user.roles.includes('tiba_admin');
  }

  private toTicketSummary(ticket: {
    id: string;
    title: string;
    status: string;
    type: string;
    project_id: string;
    customer_id: string;
    assignee_user_id: string | null;
    created_at: Date;
    updated_at: Date;
  }): TicketSummary {
    return {
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      type: ticket.type,
      projectId: ticket.project_id,
      customerId: ticket.customer_id,
      assigneeUserId: ticket.assignee_user_id,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    };
  }

  private validateCreateTicketPayload(payload: CreateTicketDto) {
    if (!payload.projectId) {
      throw new BadRequestException('projectId is required');
    }
    if (!payload.title || payload.title.trim().length === 0) {
      throw new BadRequestException('title is required');
    }
    if (!payload.description || payload.description.trim().length === 0) {
      throw new BadRequestException('description is required');
    }
    if (!TICKET_TYPES.includes(payload.type as (typeof TICKET_TYPES)[number])) {
      throw new BadRequestException(`type must be one of: ${TICKET_TYPES.join(', ')}`);
    }
    if (!TICKET_STATUSES.includes(payload.status as (typeof TICKET_STATUSES)[number])) {
      throw new BadRequestException(`status must be one of: ${TICKET_STATUSES.join(', ')}`);
    }
  }

  private validateListQuery(query: ListTicketsDto) {
    if (query.status && !TICKET_STATUSES.includes(query.status as (typeof TICKET_STATUSES)[number])) {
      throw new BadRequestException(`status must be one of: ${TICKET_STATUSES.join(', ')}`);
    }

    if (query.assignee && !['me', 'unassigned'].includes(query.assignee)) {
      throw new BadRequestException('assignee must be one of: me, unassigned');
    }

    if (query.view && !['new', 'open', 'my'].includes(query.view)) {
      throw new BadRequestException('view must be one of: new, open, my');
    }

    if (query.sort && !['updatedAt', 'createdAt'].includes(query.sort)) {
      throw new BadRequestException('sort must be one of: updatedAt, createdAt');
    }

    if (query.order && !['asc', 'desc'].includes(query.order)) {
      throw new BadRequestException('order must be one of: asc, desc');
    }
  }

  private parsePositiveInt(value: string | number | undefined, defaultValue: number, field: string, max?: number) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    if (max !== undefined && parsed > max) {
      throw new BadRequestException(`${field} must be <= ${max}`);
    }

    return parsed;
  }
}
