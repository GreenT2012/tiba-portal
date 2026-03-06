import { z } from 'zod';
import { paginationSchema } from './pagination';

export const projectStateSchema = z.enum(['active', 'archived']);
export type ProjectState = z.infer<typeof projectStateSchema>;
export const projectStateValues = projectStateSchema.options;

export const projectSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string().min(1),
  isArchived: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
export type ProjectContract = z.infer<typeof projectSchema>;

export const projectListFilterSchema = z.object({
  q: z.string().optional(),
  customerId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['name', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});
export type ProjectListFilterContract = z.infer<typeof projectListFilterSchema>;

export const paginatedProjectsSchema = paginationSchema.extend({
  items: z.array(projectSchema)
});
export type PaginatedProjectsContract = z.infer<typeof paginatedProjectsSchema>;
