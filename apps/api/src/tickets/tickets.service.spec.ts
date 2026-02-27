import { AuditService } from '../audit/audit.service';
import { TicketsService } from './tickets.service';

function makePrismaMock() {
  const tx = {
    ticket: {
      create: jest.fn(),
      update: jest.fn()
    },
    ticketComment: {
      create: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    }
  };

  const prisma = {
    $transaction: jest.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (txArg: typeof tx) => Promise<unknown>)(tx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
    project: {
      findFirst: jest.fn()
    },
    ticket: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  };

  return { prisma, tx };
}

describe('TicketsService audit logging', () => {
  it('writes created audit event on createTicket', async () => {
    const { prisma, tx } = makePrismaMock();
    prisma.project.findFirst.mockResolvedValue({ id: 'p1', customer_id: 'c1' });
    tx.ticket.create.mockResolvedValue({
      id: 't1',
      customer_id: 'c1',
      project_id: 'p1',
      type: 'Bug',
      status: 'OPEN',
      title: 'Example',
      description: 'Desc',
      assignee_user_id: null,
      created_by_user_id: 'u1',
      created_at: new Date(),
      updated_at: new Date(),
      comments: [],
      attachments: []
    });

    const service = new TicketsService(prisma as any, new AuditService(prisma as any));

    await service.createTicket(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
      { projectId: 'p1', title: 'Example', description: 'Desc', type: 'Bug' }
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'created',
          entity_type: 'ticket',
          entity_id: 't1',
          customer_id: 'c1',
          actor_user_id: 'u1',
          actor_role: 'customer_user',
          meta_json: { type: 'Bug', status: 'OPEN', projectId: 'p1' }
        })
      })
    );
  });

  it('writes status_changed audit event on updateTicketStatus', async () => {
    const { prisma, tx } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', customer_id: 'c1', status: 'OPEN' });
    tx.ticket.update.mockResolvedValue({
      id: 't1',
      customer_id: 'c1',
      project_id: 'p1',
      type: 'Bug',
      status: 'IN_PROGRESS',
      title: 'Example',
      description: 'Desc',
      assignee_user_id: null,
      created_by_user_id: 'u1',
      created_at: new Date(),
      updated_at: new Date(),
      comments: [],
      attachments: []
    });

    const service = new TicketsService(prisma as any, new AuditService(prisma as any));

    await service.updateTicketStatus(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
      't1',
      { status: 'IN_PROGRESS' }
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'status_changed',
          meta_json: { from: 'OPEN', to: 'IN_PROGRESS' }
        })
      })
    );
  });

  it('writes assigned audit event on assignTicket', async () => {
    const { prisma, tx } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't1',
      customer_id: 'c1',
      assignee_user_id: null
    });
    tx.ticket.update.mockResolvedValue({
      id: 't1',
      customer_id: 'c1',
      project_id: 'p1',
      type: 'Bug',
      status: 'OPEN',
      title: 'Example',
      description: 'Desc',
      assignee_user_id: 'agent-1',
      created_by_user_id: 'u1',
      created_at: new Date(),
      updated_at: new Date(),
      comments: [],
      attachments: []
    });

    const service = new TicketsService(prisma as any, new AuditService(prisma as any));

    await service.assignTicket(
      { sub: 'a1', roles: ['tiba_agent'], customerId: null, email: null },
      't1',
      { assigneeUserId: 'agent-1' }
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'assigned',
          actor_role: 'tiba_agent',
          meta_json: { from: null, to: 'agent-1' }
        })
      })
    );
  });

  it('writes comment_added audit event on addComment', async () => {
    const { prisma, tx } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', customer_id: 'c1' });
    tx.ticketComment.create.mockResolvedValue({
      id: 'cm1',
      ticket_id: 't1',
      customer_id: 'c1',
      author_user_id: 'u1',
      body: 'hello',
      created_at: new Date()
    });
    tx.ticket.update.mockResolvedValue({});

    const service = new TicketsService(prisma as any, new AuditService(prisma as any));

    await service.addComment(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
      't1',
      { body: 'hello' }
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'comment_added',
          meta_json: { commentId: 'cm1' }
        })
      })
    );
  });
});
