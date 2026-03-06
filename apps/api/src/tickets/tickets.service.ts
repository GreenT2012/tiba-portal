import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ticketStatusValues, type TicketStatus, type TicketType } from '@tiba/shared/tickets';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user.interface';
import { assertInternalUser, assertTenantResourceVisible, isCustomerUser, isInternalUser } from '../auth/authz';
import { PrismaService } from '../prisma/prisma.service';
import { toTicketCommentDto, toTicketDto, toTicketSummaryDto } from './tickets.mapper';
import { TicketAssigneeService } from './ticket-assignee.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketEventsService } from './ticket-events.service';
import { buildTicketListQueryPlan } from './ticket-query.builder';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { PresignUploadAttachmentDto } from './dto/presign-upload-attachment.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import {
  PresignDownloadAttachmentResponseDto,
  PresignUploadAttachmentResponseDto,
  TicketCommentDto,
  TicketDto,
  TicketListResponseDto
} from './tickets.types';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly ticketAttachmentsService: TicketAttachmentsService,
    private readonly ticketAssigneeService: TicketAssigneeService,
    private readonly ticketEventsService: TicketEventsService
  ) {}

  async listTickets(user: AuthUser, query: ListTicketsDto): Promise<TicketListResponseDto> {
    const plan = buildTicketListQueryPlan(user, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where: plan.where,
        orderBy: { [plan.orderByField]: plan.orderByDirection },
        skip: (plan.page - 1) * plan.pageSize,
        take: plan.pageSize
      }),
      this.prisma.ticket.count({ where: plan.where })
    ]);

    return {
      items: items.map(toTicketSummaryDto),
      page: plan.page,
      pageSize: plan.pageSize,
      total
    };
  }

  async createTicket(user: AuthUser, dto: CreateTicketDto): Promise<TicketDto> {
    const status = dto.status ?? 'OPEN';

    if (!ticketStatusValues.includes(status as (typeof ticketStatusValues)[number])) {
      throw new BadRequestException('status must be one of: OPEN, IN_PROGRESS, CLOSED');
    }

    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId } });

    if (!project) {
      throw new BadRequestException('Project not found');
    }

    if (isCustomerUser(user)) {
      if (!user.customerId) {
        throw new ForbiddenException('customer_id claim is required for customer_user');
      }
      if (dto.customerId) {
        throw new BadRequestException('customerId cannot be set by customer_user');
      }
      if (dto.assigneeUserId) {
        throw new BadRequestException('assigneeUserId cannot be set by customer_user');
      }
      if (project.customer_id !== user.customerId) {
        throw new BadRequestException('Project not found for customer');
      }
    } else if (isInternalUser(user)) {
      if (dto.customerId && dto.customerId !== project.customer_id) {
        throw new BadRequestException('customerId does not match project customer');
      }
    } else {
      throw new ForbiddenException('Unsupported role');
    }

    const customerId = project.customer_id;

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          customer_id: customerId,
          project_id: dto.projectId,
          type: dto.type,
          status,
          title: dto.title,
          description: dto.description,
          assignee_user_id: dto.assigneeUserId ?? null,
          created_by_user_id: user.sub
        },
        include: {
          comments: true,
          attachments: true
        }
      });

      await this.auditService.write(
        {
          customerId: created.customer_id,
          entityType: 'ticket',
          entityId: created.id,
          action: 'created',
          actorUserId: user.sub,
          actorRoles: user.roles,
          metaJson: {
            type: created.type,
            status: created.status,
            projectId: created.project_id,
            assigneeUserId: created.assignee_user_id
          }
        },
        tx as Pick<PrismaService, 'auditLog'>
      );

      await this.ticketEventsService.publish(
        {
          topic: 'ticket.created',
          payload: {
            ticketId: created.id,
            customerId: created.customer_id,
            projectId: created.project_id,
            type: created.type as TicketType,
            status: created.status as TicketStatus,
            assigneeUserId: created.assignee_user_id
          }
        },
        tx as Pick<PrismaService, 'outboxEvent'>
      );

      return created;
    });

    return toTicketDto(ticket as any);
  }

  async getTicketById(user: AuthUser, id: string): Promise<TicketDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        comments: { orderBy: { created_at: 'asc' } },
        attachments: { orderBy: { created_at: 'asc' } }
      }
    });

    assertTenantResourceVisible(user, ticket, 'Ticket');
    return this.ticketAssigneeService.enrich(toTicketDto(ticket as any));
  }

  async updateTicketStatus(user: AuthUser, id: string, dto: UpdateTicketStatusDto): Promise<TicketDto> {
    assertInternalUser(user);

    if (!ticketStatusValues.includes(dto.status as (typeof ticketStatusValues)[number])) {
      throw new BadRequestException('status must be one of: OPEN, IN_PROGRESS, CLOSED');
    }

    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    assertTenantResourceVisible(user, existing, 'Ticket');

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.ticket.update({
        where: { id },
        data: { status: dto.status },
        include: { comments: true, attachments: true }
      });

      await this.auditService.write(
        {
          customerId: next.customer_id,
          entityType: 'ticket',
          entityId: next.id,
          action: 'status_changed',
          actorUserId: user.sub,
          actorRoles: user.roles,
          metaJson: { from: existing.status, to: next.status }
        },
        tx as Pick<PrismaService, 'auditLog'>
      );

      await this.ticketEventsService.publish(
        {
          topic: 'ticket.status_changed',
          payload: {
            ticketId: next.id,
            customerId: next.customer_id,
            from: existing.status as TicketStatus,
            to: next.status as TicketStatus
          }
        },
        tx as Pick<PrismaService, 'outboxEvent'>
      );

      return next;
    });

    return toTicketDto(updated as any);
  }

  async assignTicket(user: AuthUser, id: string, dto: AssignTicketDto): Promise<TicketDto> {
    assertInternalUser(user);

    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    assertTenantResourceVisible(user, existing, 'Ticket');

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.ticket.update({
        where: { id },
        data: { assignee_user_id: dto.assigneeUserId ?? null },
        include: { comments: true, attachments: true }
      });

      await this.auditService.write(
        {
          customerId: next.customer_id,
          entityType: 'ticket',
          entityId: next.id,
          action: 'assigned',
          actorUserId: user.sub,
          actorRoles: user.roles,
          metaJson: { from: existing.assignee_user_id ?? null, to: next.assignee_user_id ?? null }
        },
        tx as Pick<PrismaService, 'auditLog'>
      );

      await this.ticketEventsService.publish(
        {
          topic: 'ticket.assigned',
          payload: {
            ticketId: next.id,
            customerId: next.customer_id,
            from: existing.assignee_user_id ?? null,
            to: next.assignee_user_id ?? null
          }
        },
        tx as Pick<PrismaService, 'outboxEvent'>
      );

      return next;
    });

    return toTicketDto(updated as any);
  }

  async addComment(user: AuthUser, id: string, dto: CreateTicketCommentDto): Promise<TicketCommentDto> {
    if (!dto.body || dto.body.trim().length === 0) {
      throw new BadRequestException('body is required');
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    assertTenantResourceVisible(user, ticket, 'Ticket');

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticketComment.create({
        data: {
          ticket_id: ticket.id,
          customer_id: ticket.customer_id,
          author_user_id: user.sub,
          body: dto.body
        }
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updated_at: new Date() }
      });

      await this.auditService.write(
        {
          customerId: ticket.customer_id,
          entityType: 'ticket',
          entityId: ticket.id,
          action: 'comment_added',
          actorUserId: user.sub,
          actorRoles: user.roles,
          metaJson: { commentId: created.id }
        },
        tx as Pick<PrismaService, 'auditLog'>
      );

      await this.ticketEventsService.publish(
        {
          topic: 'ticket.comment_added',
          payload: {
            ticketId: ticket.id,
            customerId: ticket.customer_id,
            commentId: created.id
          }
        },
        tx as Pick<PrismaService, 'outboxEvent'>
      );

      return created;
    });

    return toTicketCommentDto(comment as any);
  }

  async presignAttachmentUpload(
    user: AuthUser,
    ticketId: string,
    dto: PresignUploadAttachmentDto
  ): Promise<PresignUploadAttachmentResponseDto> {
    this.ticketAttachmentsService.validateInput(dto);

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    assertTenantResourceVisible(user, ticket, 'Ticket');

    const attachmentId = randomUUID();
    const { safeFilename, objectKey } = this.ticketAttachmentsService.createObjectKey(
      ticket.customer_id,
      ticket.id,
      attachmentId,
      dto.filename
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.ticketAttachment.create({
        data: {
          id: attachmentId,
          ticket_id: ticket.id,
          customer_id: ticket.customer_id,
          filename: safeFilename,
          mime: dto.mime,
          size_bytes: dto.sizeBytes,
          object_key: objectKey,
          uploaded_by_user_id: user.sub
        }
      });

      await tx.ticket.update({
        where: { id: ticket.id },
        data: { updated_at: new Date() }
      });

      await this.auditService.write(
        {
          customerId: ticket.customer_id,
          entityType: 'ticket',
          entityId: ticket.id,
          action: 'attachment_added',
          actorUserId: user.sub,
          actorRoles: user.roles,
          metaJson: {
            filename: safeFilename,
            mime: dto.mime,
            sizeBytes: dto.sizeBytes,
            attachmentId
          }
        },
        tx as Pick<PrismaService, 'auditLog'>
      );

      await this.ticketEventsService.publish(
        {
          topic: 'ticket.attachment_added',
          payload: {
            ticketId: ticket.id,
            customerId: ticket.customer_id,
            attachmentId,
            filename: safeFilename,
            mime: dto.mime,
            sizeBytes: dto.sizeBytes
          }
        },
        tx as Pick<PrismaService, 'outboxEvent'>
      );
    });

    return this.ticketAttachmentsService.buildPresignedUploadResponse(objectKey, dto.mime, attachmentId);
  }

  async presignAttachmentDownload(
    user: AuthUser,
    ticketId: string,
    attachmentId: string
  ): Promise<PresignDownloadAttachmentResponseDto> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    assertTenantResourceVisible(user, ticket, 'Ticket');

    const attachment = await this.prisma.ticketAttachment.findFirst({
      where: {
        id: attachmentId,
        ticket_id: ticket.id
      }
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const downloadUrl = await this.ticketAttachmentsService.getDownloadUrl(attachment.object_key);
    return { downloadUrl };
  }
}
