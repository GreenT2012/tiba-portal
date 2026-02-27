import { TicketsService } from './tickets.service';

describe('TicketsService createTicket', () => {
  it('defaults status to OPEN when missing', async () => {
    const create = jest.fn().mockResolvedValue({ id: 't1', status: 'OPEN' });
    const service = new TicketsService({ ticket: { create } } as any);

    await service.createTicket(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
      {
        projectId: 'p1',
        title: 'Example',
        description: 'Desc',
        type: 'Bug'
      }
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'OPEN' })
      })
    );
  });
});
