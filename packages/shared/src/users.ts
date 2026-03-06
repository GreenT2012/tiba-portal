import { z } from 'zod';
import { roleSchema } from './auth';

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

export const userListFilterSchema = z.object({
  q: z.string().optional(),
  role: roleSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).optional()
});
export type UserListFilterContract = z.infer<typeof userListFilterSchema>;
