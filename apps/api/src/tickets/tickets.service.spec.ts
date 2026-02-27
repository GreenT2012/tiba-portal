import { TicketsService } from './tickets.service';

describe('TicketsService createTicket', () => {
  it('defaults status to OPEN when missing and returns camelCase keys', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 't1',
      customer_id: 'c1',
      project_id: 'p1',
      type: 'Bug',
      status: 'OPEN',
      title: 'Example',
      description: 'Desc',
      assignee_user_id: null,
      created_by_user_id: 'u1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      comments: [],
      attachments: []
    });

    const findFirst = jest.fn().mockResolvedValue({ id: 'p1', customer_id: 'c1' });

    const service = new TicketsService({
      ticket: { create },
      project: { findFirst }
    } as any);

    const result = await service.createTicket(
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
    expect(result).toHaveProperty('customerId', 'c1');
    expect(result).toHaveProperty('projectId', 'p1');
    expect(JSON.stringify(result)).not.toContain('customer_id');
    expect(JSON.stringify(result)).not.toContain('project_id');
  });
});
