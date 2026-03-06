import { z } from 'zod';

export const adminOverviewSchema = z.object({
  customerCount: z.number().int().nonnegative(),
  userManagementEnabled: z.boolean()
});
export type AdminOverviewContract = z.infer<typeof adminOverviewSchema>;
