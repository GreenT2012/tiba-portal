import {
  paginatedTicketsSchema,
  presignDownloadAttachmentResponseSchema,
  presignUploadAttachmentResponseSchema,
  ticketCommentSchema,
  ticketDetailSchema,
  type TicketDetailContract,
  type TicketSummaryContract
} from '@tiba/shared/tickets';
import { requestJson } from '../http';

export type TicketSummary = TicketSummaryContract;
export type TicketDetail = TicketDetailContract;

export async function listTickets(params: {
  view?: 'new' | 'open' | 'my';
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  projectId?: string;
  page?: number;
  pageSize?: number;
  sort?: 'updatedAt' | 'createdAt';
  order?: 'asc' | 'desc';
} = {}) {
  const search = new URLSearchParams();
  if (params.view) search.set('view', params.view);
  if (params.status) search.set('status', params.status);
  if (params.projectId) search.set('projectId', params.projectId);
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 20));
  search.set('sort', params.sort ?? 'updatedAt');
  search.set('order', params.order ?? 'desc');

  return requestJson(`/api/backend/tickets?${search.toString()}`, { cache: 'no-store' }, paginatedTicketsSchema, 'Failed to load tickets');
}

export async function getTicket(ticketId: string) {
  return requestJson(`/api/backend/tickets/${ticketId}`, { cache: 'no-store' }, ticketDetailSchema, 'Failed to load ticket');
}

export async function createTicket(body: {
  projectId: string;
  type: string;
  title: string;
  description: string;
  assigneeUserId?: string | null;
}) {
  return requestJson(
    '/api/backend/tickets',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    ticketDetailSchema,
    'Failed to create ticket'
  );
}

export async function addTicketComment(ticketId: string, body: { body: string }) {
  return requestJson(
    `/api/backend/tickets/${ticketId}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    ticketCommentSchema,
    'Failed to add comment'
  );
}

export async function updateTicketStatus(ticketId: string, body: { status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' }) {
  return requestJson(
    `/api/backend/tickets/${ticketId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    ticketDetailSchema,
    'Failed to update status'
  );
}

export async function assignTicket(ticketId: string, body: { assigneeUserId: string | null }) {
  return requestJson(
    `/api/backend/tickets/${ticketId}/assign`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    ticketDetailSchema,
    'Failed to update assignee'
  );
}

export async function presignTicketAttachmentUpload(
  ticketId: string,
  body: { filename: string; mime: string; sizeBytes: number }
) {
  return requestJson(
    `/api/backend/tickets/${ticketId}/attachments/presign-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    },
    presignUploadAttachmentResponseSchema,
    'Failed to prepare attachment upload'
  );
}

export async function presignTicketAttachmentDownload(ticketId: string, attachmentId: string) {
  return requestJson(
    `/api/backend/tickets/${ticketId}/attachments/${attachmentId}/presign-download`,
    undefined,
    presignDownloadAttachmentResponseSchema,
    'Failed to load preview URL'
  );
}
