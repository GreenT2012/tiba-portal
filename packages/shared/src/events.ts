import { z } from 'zod';
import { ticketStatusSchema, ticketTypeSchema } from './tickets';

export const outboxStatusSchema = z.enum(['PENDING', 'PUBLISHED', 'FAILED']);
export type OutboxStatus = z.infer<typeof outboxStatusSchema>;

export const ticketEventTopicSchema = z.enum([
  'ticket.created',
  'ticket.status_changed',
  'ticket.assigned',
  'ticket.comment_added',
  'ticket.attachment_added'
]);
export type TicketEventTopic = z.infer<typeof ticketEventTopicSchema>;

const ticketCreatedPayloadSchema = z.object({
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  projectId: z.string().uuid(),
  type: ticketTypeSchema,
  status: ticketStatusSchema,
  assigneeUserId: z.string().nullable()
});

const ticketStatusChangedPayloadSchema = z.object({
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  from: ticketStatusSchema,
  to: ticketStatusSchema
});

const ticketAssignedPayloadSchema = z.object({
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  from: z.string().nullable(),
  to: z.string().nullable()
});

const ticketCommentAddedPayloadSchema = z.object({
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  commentId: z.string().uuid()
});

const ticketAttachmentAddedPayloadSchema = z.object({
  ticketId: z.string().uuid(),
  customerId: z.string().uuid(),
  attachmentId: z.string().uuid(),
  filename: z.string().min(1),
  mime: z.string().min(1),
  sizeBytes: z.number().int().nonnegative()
});

export const ticketLifecycleEventSchema = z.discriminatedUnion('topic', [
  z.object({
    topic: z.literal('ticket.created'),
    payload: ticketCreatedPayloadSchema
  }),
  z.object({
    topic: z.literal('ticket.status_changed'),
    payload: ticketStatusChangedPayloadSchema
  }),
  z.object({
    topic: z.literal('ticket.assigned'),
    payload: ticketAssignedPayloadSchema
  }),
  z.object({
    topic: z.literal('ticket.comment_added'),
    payload: ticketCommentAddedPayloadSchema
  }),
  z.object({
    topic: z.literal('ticket.attachment_added'),
    payload: ticketAttachmentAddedPayloadSchema
  })
]);
export type TicketLifecycleEventContract = z.infer<typeof ticketLifecycleEventSchema>;

export const outboxEventSchema = z.object({
  id: z.string().uuid(),
  topic: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  customerId: z.string().uuid().nullable(),
  payload: z.unknown(),
  status: outboxStatusSchema,
  createdAt: z.coerce.date(),
  publishedAt: z.coerce.date().nullable()
});
export type OutboxEventContract = z.infer<typeof outboxEventSchema>;
