import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { toTicketCommentDto, toTicketDto, toTicketSummaryDto } from './tickets.mapper';
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

const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;
const DEFAULT_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService
  ) {}

  async listTickets(user: AuthUser, query: ListTicketsDto): Promise<TicketListResponseDto> {
    if (this.isCustomerUser(user) && query.customerId) {
      throw new ForbiddenException('customerId is not allowed for customer_user');
    }

    const where: any = {};
    const customerId = this.isCustomerUser(user) ? user.customerId : query.customerId;
    if (this.isCustomerUser(user) && !customerId) {
      throw new ForbiddenException('customer_id claim is required for customer_user');
    }
    if (customerId) where.customer_id = customerId;
    if (query.projectId) where.project_id = query.projectId;

    if (query.view === 'new') {
      where.status = 'OPEN';
      where.assignee_user_id = null;
    }
    if (query.view === 'open') {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }
    if (query.view === 'my') {
      where.assignee_user_id = user.sub;
      where.status = { not: 'CLOSED' };
    }

    if (query.status) where.status = query.status;
    if (query.assignee === 'me') where.assignee_user_id = user.sub;
    if (query.assignee === 'unassigned') where.assignee_user_id = null;

    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);
    const orderByField = query.sort === 'createdAt' ? 'created_at' : 'updated_at';
    const orderByDirection = query.order === 'asc' ? 'asc' : 'desc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { [orderByField]: orderByDirection },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.ticket.count({ where })
    ]);

    return {
      items: items.map(toTicketSummaryDto),
      page,
      pageSize,
      total
    };
  }

  async createTicket(user: AuthUser, dto: CreateTicketDto): Promise<TicketDto> {
    const status = dto.status ?? 'OPEN';

    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new BadRequestException('status must be one of: OPEN, IN_PROGRESS, CLOSED');
    }

    const customerId = this.resolveCreateCustomerId(user, dto);
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, customer_id: customerId }
    });

    if (!project) {
      throw new BadRequestException('Project not found for customer');
    }

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
          metaJson: { type: created.type, status: created.status, projectId: created.project_id }
        },
        tx as Pick<PrismaService, 'auditLog'>
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

    this.assertTicketVisible(user, ticket);
    return toTicketDto(ticket as any);
  }

  async updateTicketStatus(user: AuthUser, id: string, dto: UpdateTicketStatusDto): Promise<TicketDto> {
    if (!STATUSES.includes(dto.status as (typeof STATUSES)[number])) {
      throw new BadRequestException('status must be one of: OPEN, IN_PROGRESS, CLOSED');
    }

    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    this.assertTicketVisible(user, existing);

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

      return next;
    });

    return toTicketDto(updated as any);
  }

  async assignTicket(user: AuthUser, id: string, dto: AssignTicketDto): Promise<TicketDto> {
    if (!this.isInternalUser(user)) {
      throw new ForbiddenException('Only tiba_agent/tiba_admin can assign tickets');
    }

    const existing = await this.prisma.ticket.findUnique({ where: { id } });
    this.assertTicketVisible(user, existing);

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

      return next;
    });

    return toTicketDto(updated as any);
  }

  async addComment(user: AuthUser, id: string, dto: CreateTicketCommentDto): Promise<TicketCommentDto> {
    if (!dto.body || dto.body.trim().length === 0) {
      throw new BadRequestException('body is required');
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    this.assertTicketVisible(user, ticket);

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

      return created;
    });

    return toTicketCommentDto(comment as any);
  }

  async presignAttachmentUpload(
    user: AuthUser,
    ticketId: string,
    dto: PresignUploadAttachmentDto
  ): Promise<PresignUploadAttachmentResponseDto> {
    this.validateAttachmentInput(dto);

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    this.assertTicketVisible(user, ticket);

    const attachmentId = randomUUID();
    const safeFilename = this.sanitizeFilename(dto.filename);
    const objectKey = this.storageService.createObjectKey(ticket.customer_id, ticket.id, attachmentId, safeFilename);

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
    });

    const uploadUrl = await this.storageService.getPresignedUploadUrl(objectKey, dto.mime);

    return {
      attachmentId,
      objectKey,
      uploadUrl,
      requiredHeaders: {
        'Content-Type': dto.mime
      }
    };
  }

  async presignAttachmentDownload(
    user: AuthUser,
    ticketId: string,
    attachmentId: string
  ): Promise<PresignDownloadAttachmentResponseDto> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    this.assertTicketVisible(user, ticket);

    const attachment = await this.prisma.ticketAttachment.findFirst({
      where: {
        id: attachmentId,
        ticket_id: ticket.id
      }
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const downloadUrl = await this.storageService.getPresignedDownloadUrl(attachment.object_key);
    return { downloadUrl };
  }

  private resolveCreateCustomerId(user: AuthUser, dto: CreateTicketDto): string {
    if (this.isCustomerUser(user)) {
      if (!user.customerId) {
        throw new ForbiddenException('customer_id claim is required for customer_user');
      }
      if (dto.customerId) {
        throw new BadRequestException('customerId cannot be set by customer_user');
      }
      if (dto.assigneeUserId) {
        throw new BadRequestException('assigneeUserId cannot be set by customer_user');
      }
      return user.customerId;
    }

    if (this.isInternalUser(user)) {
      if (!dto.customerId) {
        throw new BadRequestException('customerId is required for internal ticket creation');
      }
      return dto.customerId;
    }

    throw new ForbiddenException('Unsupported role');
  }

  private assertTicketVisible<T extends { id: string; customer_id: string }>(
    user: AuthUser,
    ticket: T | null
  ): asserts ticket is T {
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (this.isCustomerUser(user) && ticket.customer_id !== user.customerId) {
      throw new NotFoundException('Ticket not found');
    }
  }

  private isCustomerUser(user: AuthUser) {
    return user.roles.includes('customer_user');
  }

  private isInternalUser(user: AuthUser) {
    return user.roles.includes('tiba_agent') || user.roles.includes('tiba_admin');
  }

  private validateAttachmentInput(dto: PresignUploadAttachmentDto) {
    if (!dto.filename || dto.filename.trim().length === 0) {
      throw new BadRequestException('filename is required');
    }
    if (!dto.mime || dto.mime.trim().length === 0) {
      throw new BadRequestException('mime is required');
    }
    if (!this.isAllowedMime(dto.mime)) {
      throw new BadRequestException('mime must be application/pdf or image/*');
    }
    if (!Number.isFinite(dto.sizeBytes) || dto.sizeBytes <= 0) {
      throw new BadRequestException('sizeBytes must be a positive number');
    }
    const maxBytes = this.getMaxAttachmentBytes();
    if (dto.sizeBytes > maxBytes) {
      throw new BadRequestException(`sizeBytes exceeds max allowed (${maxBytes})`);
    }
    // TODO: add content sniffing beyond mime value in later iteration.
  }

  private isAllowedMime(mime: string) {
    return mime === 'application/pdf' || mime.startsWith('image/');
  }

  private getMaxAttachmentBytes() {
    const raw = Number(process.env.MAX_ATTACHMENT_BYTES ?? DEFAULT_MAX_ATTACHMENT_BYTES);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_ATTACHMENT_BYTES;
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^\w.\-]/g, '_').replace(/^_+/, '').slice(0, 255) || 'attachment';
  }
}
