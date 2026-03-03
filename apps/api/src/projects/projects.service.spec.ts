import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

function makePrismaMock() {
  const prisma = {
    $transaction: jest.fn((queries: unknown[]) => Promise.all(queries as Promise<unknown>[])),
    project: {
      findMany: jest.fn(),
      count: jest.fn()
    }
  };

  return prisma;
}

describe('ProjectsService', () => {
  it('scopes customer_user to own customerId', async () => {
    const prisma = makePrismaMock();
    const service = new ProjectsService(prisma as any);

    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        customer_id: 'c1',
        name: 'Alpha',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-02T00:00:00.000Z')
      }
    ]);
    prisma.project.count.mockResolvedValue(1);

    const result = await service.listProjects(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: 'u1@example.com' },
      {}
    );

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'c1' })
      })
    );
    expect(result.items[0].customerId).toBe('c1');
  });

  it('allows tiba_agent to filter by customerId', async () => {
    const prisma = makePrismaMock();
    const service = new ProjectsService(prisma as any);

    prisma.project.findMany.mockResolvedValue([]);
    prisma.project.count.mockResolvedValue(0);

    await service.listProjects(
      { sub: 'a1', roles: ['tiba_agent'], customerId: null, email: 'a1@example.com' },
      { customerId: 'c2' }
    );

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'c2' })
      })
    );
  });

  it('forbids customer_user from using customerId query', async () => {
    const prisma = makePrismaMock();
    const service = new ProjectsService(prisma as any);

    await expect(
      service.listProjects(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: 'u1@example.com' },
        { customerId: 'c2' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
