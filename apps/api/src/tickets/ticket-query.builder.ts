import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.interface';
import { isCustomerUser } from '../auth/authz';
import type { ListTicketsDto } from './dto/list-tickets.dto';

export type TicketListQueryPlan = {
  where: Record<string, unknown>;
  page: number;
  pageSize: number;
  orderByField: 'created_at' | 'updated_at';
  orderByDirection: 'asc' | 'desc';
};

export function buildTicketListQueryPlan(user: AuthUser, query: ListTicketsDto): TicketListQueryPlan {
  if (isCustomerUser(user) && query.customerId) {
    throw new ForbiddenException('customerId is not allowed for customer_user');
  }

  const where: Record<string, unknown> = {};
  const customerId = isCustomerUser(user) ? user.customerId : query.customerId;
  if (isCustomerUser(user) && !customerId) {
    throw new ForbiddenException('customer_id claim is required for customer_user');
  }
  if (customerId) where.customer_id = customerId;
  if (query.projectId) where.project_id = query.projectId;

  if (query.view === 'new') {
    where.status = 'OPEN';
    where.assignee_user_id = null;
  }
  if (query.view === 'open') {
    where.status = { in: ['OPEN', 'IN_PROGRESS'] };
  }
  if (query.view === 'my') {
    where.assignee_user_id = user.sub;
    where.status = { not: 'CLOSED' };
  }

  if (query.status) where.status = query.status;
  if (query.assignee === 'me') where.assignee_user_id = user.sub;
  if (query.assignee === 'unassigned') where.assignee_user_id = null;

  const page = Math.max(Number(query.page ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize ?? 20), 1), 100);

  return {
    where,
    page,
    pageSize,
    orderByField: query.sort === 'createdAt' ? 'created_at' : 'updated_at',
    orderByDirection: query.order === 'asc' ? 'asc' : 'desc'
  };
}
