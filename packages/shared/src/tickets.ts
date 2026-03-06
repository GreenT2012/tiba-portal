import { z } from 'zod';
import { paginationSchema } from './pagination';
import { userSchema } from './users';

export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export const ticketStatusValues = ticketStatusSchema.options;

export const ticketTypeSchema = z.enum(['Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin']);
export type TicketType = z.infer<typeof ticketTypeSchema>;
export const ticketTypeValues = ticketTypeSchema.options;

export const ticketSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  status: ticketStatusSchema,
  type: ticketTypeSchema,
  projectId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  assigneeUserId: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
});
export type Ticket = z.infer<typeof ticketSchema>;

export const ticketCommentSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  authorUserId: z.string().min(1),
  body: z.string().min(1),
  createdAt: z.coerce.date()
});
export type TicketCommentContract = z.infer<typeof ticketCommentSchema>;

export const ticketAttachmentSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  filename: z.string().min(1),
  mime: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  objectKey: z.string().min(1),
  uploadedByUserId: z.string().min(1),
  createdAt: z.coerce.date()
});
export type TicketAttachmentContract = z.infer<typeof ticketAttachmentSchema>;

export const presignUploadAttachmentResponseSchema = z.object({
  attachmentId: z.string().uuid(),
  objectKey: z.string().min(1),
  uploadUrl: z.string().url(),
  requiredHeaders: z.object({
    'Content-Type': z.string().min(1)
  })
});
export type PresignUploadAttachmentResponseContract = z.infer<typeof presignUploadAttachmentResponseSchema>;

export const presignDownloadAttachmentResponseSchema = z.object({
  downloadUrl: z.string().url()
});
export type PresignDownloadAttachmentResponseContract = z.infer<typeof presignDownloadAttachmentResponseSchema>;

export const ticketSummarySchema = ticketSchema.extend({
  assignee: userSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  projectId: z.string().uuid(),
  customerId: z.string().uuid(),
  assigneeUserId: z.string().nullable()
});
export type TicketSummaryContract = z.infer<typeof ticketSummarySchema>;

export const ticketDetailSchema = ticketSummarySchema.extend({
  description: z.string(),
  createdByUserId: z.string().nullable(),
  comments: z.array(ticketCommentSchema),
  attachments: z.array(ticketAttachmentSchema)
});
export type TicketDetailContract = z.infer<typeof ticketDetailSchema>;

export const paginatedTicketsSchema = paginationSchema.extend({
  items: z.array(ticketSummarySchema)
});
export type PaginatedTicketsContract = z.infer<typeof paginatedTicketsSchema>;

export const ticketListFilterSchema = z.object({
  status: ticketStatusSchema.optional(),
  projectId: z.string().uuid().optional(),
  assignee: z.enum(['me', 'unassigned']).optional(),
  view: z.enum(['new', 'open', 'my']).optional(),
  sort: z.enum(['updatedAt', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  customerId: z.string().uuid().optional()
});
export type TicketListFilterContract = z.infer<typeof ticketListFilterSchema>;
