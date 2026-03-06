import { z } from 'zod';
import { paginationSchema } from './pagination';

export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});
export type CustomerContract = z.infer<typeof customerSchema>;

export const customerListFilterSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['name', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});
export type CustomerListFilterContract = z.infer<typeof customerListFilterSchema>;

export const paginatedCustomersSchema = paginationSchema.extend({
  items: z.array(customerSchema)
});
export type PaginatedCustomersContract = z.infer<typeof paginatedCustomersSchema>;
