import { z } from 'zod';

export const roleSchema = z.enum(['customer_user', 'tiba_agent', 'tiba_admin']);
export type Role = z.infer<typeof roleSchema>;
export const roleValues = roleSchema.options;
