import { dashboardOverviewSchema } from '@tiba/shared/dashboard';
import { requestJson } from '../http';

export async function getDashboardOverview() {
  return requestJson(
    '/api/backend/dashboard/overview',
    { cache: 'no-store' },
    dashboardOverviewSchema,
    'Failed to load dashboard overview'
  );
}
