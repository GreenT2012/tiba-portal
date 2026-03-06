import { z } from 'zod';

export const roleSchema = z.enum(['customer_user', 'tiba_agent', 'tiba_admin']);
export type Role = z.infer<typeof roleSchema>;
export const roleValues = roleSchema.options;

export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export const ticketStatusValues = ticketStatusSchema.options;

export const ticketTypeSchema = z.enum(['Bug', 'Feature', 'Content', 'Marketing', 'Tracking', 'Plugin']);
export type TicketType = z.infer<typeof ticketTypeSchema>;
export const ticketTypeValues = ticketTypeSchema.options;

export const projectStateSchema = z.enum(['active', 'archived']);
export type ProjectState = z.infer<typeof projectStateSchema>;
export const projectStateValues = projectStateSchema.options;

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative()
});
export type Pagination = z.infer<typeof paginationSchema>;

export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
export type CustomerContract = z.infer<typeof customerSchema>;

export const projectSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string().min(1),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
export type ProjectContract = z.infer<typeof projectSchema>;

export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().nullable(),
  email: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable()
});
export type UserContract = z.infer<typeof userSchema>;

export const provisionedUserSchema = userSchema.extend({
  roles: z.array(roleSchema).min(1),
  customerId: z.string().uuid().nullable()
});
export type ProvisionedUserContract = z.infer<typeof provisionedUserSchema>;

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

export const paginatedCustomersSchema = paginationSchema.extend({
  items: z.array(customerSchema)
});
export type PaginatedCustomersContract = z.infer<typeof paginatedCustomersSchema>;

export const paginatedProjectsSchema = paginationSchema.extend({
  items: z.array(projectSchema)
});
export type PaginatedProjectsContract = z.infer<typeof paginatedProjectsSchema>;

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

export const projectListFilterSchema = z.object({
  q: z.string().optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['name', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});
export type ProjectListFilterContract = z.infer<typeof projectListFilterSchema>;

export const customerListFilterSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['name', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});
export type CustomerListFilterContract = z.infer<typeof customerListFilterSchema>;

export const userListFilterSchema = z.object({
  q: z.string().optional(),
  role: roleSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).optional()
});
export type UserListFilterContract = z.infer<typeof userListFilterSchema>;

export const apiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'BAD_GATEWAY',
  'INTERNAL_SERVER_ERROR'
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    statusCode: z.number().int(),
    details: z.unknown().optional()
  })
});
export type ApiErrorContract = z.infer<typeof apiErrorSchema>;
