import { z } from 'zod';
import { adminOverviewSchema } from './admin';

export const dashboardTicketsOverviewSchema = z.object({
  openCount: z.number().int().nonnegative(),
  myCount: z.number().int().nonnegative().nullable(),
  newCount: z.number().int().nonnegative().nullable(),
  closedCount: z.number().int().nonnegative().nullable()
});
export type DashboardTicketsOverviewContract = z.infer<typeof dashboardTicketsOverviewSchema>;

export const dashboardProjectsOverviewSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  archivedCount: z.number().int().nonnegative()
});
export type DashboardProjectsOverviewContract = z.infer<typeof dashboardProjectsOverviewSchema>;

export const dashboardOverviewSchema = z.object({
  modules: z.object({
    tickets: dashboardTicketsOverviewSchema,
    projects: dashboardProjectsOverviewSchema,
    admin: adminOverviewSchema.nullable()
  })
});
export type DashboardOverviewContract = z.infer<typeof dashboardOverviewSchema>;
