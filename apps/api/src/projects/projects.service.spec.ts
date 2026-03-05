import { ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

function makePrismaMock() {
  const prisma = {
    $transaction: jest.fn((queries: unknown[]) => Promise.all(queries as Promise<unknown>[])),
    customer: {
      findUnique: jest.fn()
    },
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
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

  it('forbids customer_user from creating projects', async () => {
    const prisma = makePrismaMock();
    const service = new ProjectsService(prisma as any);

    await expect(
      service.createProject(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: 'u1@example.com' },
        { customerId: 'c1', name: 'New Project' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates project for tiba_agent when customer exists', async () => {
    const prisma = makePrismaMock();
    const service = new ProjectsService(prisma as any);
    prisma.customer.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.project.create.mockResolvedValue({
      id: 'p9',
      customer_id: 'c1',
      name: 'Ops',
      is_archived: false,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z')
    });

    const result = await service.createProject(
      { sub: 'a1', roles: ['tiba_agent'], customerId: null, email: 'a1@example.com' },
      { customerId: 'c1', name: 'Ops' }
    );

    expect(prisma.customer.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(result).toMatchObject({ id: 'p9', customerId: 'c1', name: 'Ops', isArchived: false });
  });

  it('updates project name and archive state for tiba_admin', async () => {
    const prisma = makePrismaMock();
    const service = new ProjectsService(prisma as any);
    prisma.project.findUnique.mockResolvedValue({
      id: 'p1',
      customer_id: 'c1',
      name: 'Alpha',
      is_archived: false,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-02T00:00:00.000Z')
    });
    prisma.project.update.mockResolvedValue({
      id: 'p1',
      customer_id: 'c1',
      name: 'Alpha Renamed',
      is_archived: true,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-03T00:00:00.000Z')
    });

    const result = await service.updateProject(
      { sub: 'admin1', roles: ['tiba_admin'], customerId: null, email: 'admin@example.com' },
      'p1',
      { name: 'Alpha Renamed', isArchived: true }
    );

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { name: 'Alpha Renamed', is_archived: true }
    });
    expect(result).toMatchObject({ id: 'p1', name: 'Alpha Renamed', isArchived: true });
  });
});
