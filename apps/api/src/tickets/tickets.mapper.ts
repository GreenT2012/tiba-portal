import {
  TicketAttachmentDto,
  TicketCommentDto,
  TicketDto,
  TicketSummaryDto
} from './tickets.types';

type TicketRecord = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  project_id: string;
  customer_id: string;
  assignee_user_id: string | null;
  created_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  comments?: TicketCommentRecord[];
  attachments?: TicketAttachmentRecord[];
};

type TicketCommentRecord = {
  id: string;
  ticket_id: string;
  customer_id: string;
  author_user_id: string;
  body: string;
  created_at: Date;
};

type TicketAttachmentRecord = {
  id: string;
  ticket_id: string;
  customer_id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  object_key: string;
  uploaded_by_user_id: string;
  created_at: Date;
};

export function toTicketSummaryDto(ticket: TicketRecord): TicketSummaryDto {
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

export function toTicketCommentDto(comment: TicketCommentRecord): TicketCommentDto {
  return {
    id: comment.id,
    ticketId: comment.ticket_id,
    customerId: comment.customer_id,
    authorUserId: comment.author_user_id,
    body: comment.body,
    createdAt: comment.created_at
  };
}

export function toTicketAttachmentDto(att: TicketAttachmentRecord): TicketAttachmentDto {
  return {
    id: att.id,
    ticketId: att.ticket_id,
    customerId: att.customer_id,
    filename: att.filename,
    mime: att.mime,
    sizeBytes: att.size_bytes,
    objectKey: att.object_key,
    uploadedByUserId: att.uploaded_by_user_id,
    createdAt: att.created_at
  };
}

export function toTicketDto(ticket: TicketRecord): TicketDto {
  return {
    ...toTicketSummaryDto(ticket),
    description: ticket.description,
    createdByUserId: ticket.created_by_user_id,
    comments: (ticket.comments ?? []).map(toTicketCommentDto),
    attachments: (ticket.attachments ?? []).map(toTicketAttachmentDto)
  };
}
