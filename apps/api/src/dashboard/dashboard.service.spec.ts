import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    ticket: { count: jest.fn() },
    project: { count: jest.fn() },
    customer: { count: jest.fn() },
    $transaction: jest.fn()
  } as any;

  let service: DashboardService;

  beforeEach(() => {
    prisma.ticket.count.mockReset();
    prisma.project.count.mockReset();
    prisma.customer.count.mockReset();
    prisma.$transaction.mockReset();
    service = new DashboardService(prisma);
  });

  it('returns customer-scoped overview for customer_user', async () => {
    prisma.$transaction.mockResolvedValue([4, 3, 2, 1]);

    const result = await service.getOverview({
      sub: 'cust-1',
      roles: ['customer_user'],
      customerId: 'customer-1',
      email: 'customer@example.com'
    });

    expect(result).toEqual({
      modules: {
        tickets: { openCount: 4, myCount: null, newCount: null, closedCount: null },
        projects: { totalCount: 3, activeCount: 2, archivedCount: 1 },
        admin: null
      }
    });
  });

  it('returns internal overview for tiba_agent', async () => {
    prisma.$transaction.mockResolvedValue([7, 12, 5, 4, 9, 8, 1, 6]);

    const result = await service.getOverview({
      sub: 'agent-1',
      roles: ['tiba_agent'],
      customerId: null,
      email: 'agent@example.com'
    });

    expect(result).toEqual({
      modules: {
        tickets: { openCount: 12, myCount: 5, newCount: 7, closedCount: 4 },
        projects: { totalCount: 9, activeCount: 8, archivedCount: 1 },
        admin: { customerCount: 6, userManagementEnabled: false }
      }
    });
  });

  it('marks user management as enabled for tiba_admin', async () => {
    prisma.$transaction.mockResolvedValue([1, 2, 3, 4, 5, 4, 1, 2]);

    const result = await service.getOverview({
      sub: 'admin-1',
      roles: ['tiba_admin'],
      customerId: null,
      email: 'admin@example.com'
    });

    expect(result.modules.admin).toEqual({ customerCount: 2, userManagementEnabled: true });
  });
});
