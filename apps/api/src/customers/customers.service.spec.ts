import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';

function makePrismaMock() {
  return {
    $transaction: jest.fn((queries: unknown[]) => Promise.all(queries as Promise<unknown>[])),
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  };
}

describe('CustomersService', () => {
  it('lists customers for tiba roles', async () => {
    const prisma = makePrismaMock();
    const service = new CustomersService(prisma as any);

    prisma.customer.findMany.mockResolvedValue([
      {
        id: 'c1',
        name: 'Acme',
        created_at: new Date('2026-01-01T00:00:00.000Z'),
        updated_at: new Date('2026-01-02T00:00:00.000Z')
      }
    ]);
    prisma.customer.count.mockResolvedValue(1);

    const result = await service.listCustomers(
      { sub: 'a1', roles: ['tiba_agent'], customerId: null, email: 'a1@example.com' },
      { q: 'ac' }
    );

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: 'ac', mode: 'insensitive' })
        })
      })
    );
    expect(result.items[0]).toMatchObject({ id: 'c1', name: 'Acme' });
  });

  it('forbids customer_user from listing customers', async () => {
    const prisma = makePrismaMock();
    const service = new CustomersService(prisma as any);

    await expect(
      service.listCustomers(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: 'u1@example.com' },
        {}
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates customer for tiba_admin', async () => {
    const prisma = makePrismaMock();
    const service = new CustomersService(prisma as any);

    prisma.customer.create.mockResolvedValue({
      id: 'c2',
      name: 'Beta',
      created_at: new Date('2026-01-03T00:00:00.000Z'),
      updated_at: new Date('2026-01-03T00:00:00.000Z')
    });

    const result = await service.createCustomer(
      { sub: 'admin1', roles: ['tiba_admin'], customerId: null, email: 'admin@example.com' },
      { name: 'Beta' }
    );

    expect(prisma.customer.create).toHaveBeenCalledWith({ data: { name: 'Beta' } });
    expect(result).toMatchObject({ id: 'c2', name: 'Beta' });
  });

  it('updates customer name for tiba_admin', async () => {
    const prisma = makePrismaMock();
    const service = new CustomersService(prisma as any);

    prisma.customer.findUnique.mockResolvedValue({
      id: 'c2',
      name: 'Beta',
      created_at: new Date('2026-01-03T00:00:00.000Z'),
      updated_at: new Date('2026-01-03T00:00:00.000Z')
    });
    prisma.customer.update.mockResolvedValue({
      id: 'c2',
      name: 'Beta Prime',
      created_at: new Date('2026-01-03T00:00:00.000Z'),
      updated_at: new Date('2026-01-04T00:00:00.000Z')
    });

    const result = await service.updateCustomer(
      { sub: 'admin1', roles: ['tiba_admin'], customerId: null, email: 'admin@example.com' },
      'c2',
      { name: 'Beta Prime' }
    );

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'c2' },
      data: { name: 'Beta Prime' }
    });
    expect(result).toMatchObject({ id: 'c2', name: 'Beta Prime' });
  });

  it('returns not found on update for missing customer', async () => {
    const prisma = makePrismaMock();
    const service = new CustomersService(prisma as any);
    prisma.customer.findUnique.mockResolvedValue(null);

    await expect(
      service.updateCustomer(
        { sub: 'admin1', roles: ['tiba_admin'], customerId: null, email: 'admin@example.com' },
        'missing',
        { name: 'New Name' }
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
