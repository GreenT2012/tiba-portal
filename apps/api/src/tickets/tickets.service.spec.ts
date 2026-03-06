import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../outbox/outbox.service';
import { TicketsService } from './tickets.service';
import { TicketAssigneeService } from './ticket-assignee.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketEventsService } from './ticket-events.service';

function makePrismaMock() {
  const tx = {
    ticket: {
      create: jest.fn(),
      update: jest.fn()
    },
    ticketComment: {
      create: jest.fn()
    },
    ticketAttachment: {
      create: jest.fn()
    },
    auditLog: {
      create: jest.fn()
    },
    outboxEvent: {
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
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    ticketAttachment: {
      findFirst: jest.fn()
    },
    outboxEvent: {
      create: jest.fn()
    }
  };

  return { prisma, tx };
}

function makeStorageMock() {
  return {
    createObjectKey: jest.fn((customerId, ticketId, attachmentId, filename) =>
      `customers/${customerId}/tickets/${ticketId}/${attachmentId}-${filename}`
    ),
    getPresignedUploadUrl: jest.fn().mockResolvedValue('https://upload.example'),
    getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://download.example')
  };
}

function makeService(prisma: any, storage?: ReturnType<typeof makeStorageMock>) {
  const effectiveStorage = storage ?? makeStorageMock();
  const auditService = new AuditService(prisma as any);
  const outboxService = new OutboxService(prisma as any);
  const ticketAttachmentsService = new TicketAttachmentsService(effectiveStorage as any);
  const ticketAssigneeService = new TicketAssigneeService();
  const ticketEventsService = new TicketEventsService(outboxService);

  return new TicketsService(
    prisma as any,
    auditService,
    ticketAttachmentsService,
    ticketAssigneeService,
    ticketEventsService
  );
}

describe('TicketsService modular flows', () => {
  it('filters ticket list by projectId', async () => {
    const { prisma } = makePrismaMock();
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.ticket.count.mockResolvedValue(0);

    const service = makeService(prisma);

    await service.listTickets(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
      { projectId: 'p1' }
    );

    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customer_id: 'c1',
          project_id: 'p1'
        })
      })
    );
  });

  it('writes audit and outbox event on createTicket', async () => {
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

    const service = makeService(prisma);

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
          meta_json: { type: 'Bug', status: 'OPEN', projectId: 'p1', assigneeUserId: null }
        })
      })
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: 'ticket.created',
          aggregate_type: 'ticket',
          aggregate_id: 't1',
          customer_id: 'c1',
          status: 'PENDING',
          payload_json: { ticketId: 't1', customerId: 'c1', projectId: 'p1', type: 'Bug', status: 'OPEN', assigneeUserId: null }
        })
      })
    );
  });

  it('allows tiba_agent create with assignee and derives customer from project', async () => {
    const { prisma, tx } = makePrismaMock();
    prisma.project.findFirst.mockResolvedValue({ id: 'p2', customer_id: 'c2' });
    tx.ticket.create.mockResolvedValue({
      id: 't2',
      customer_id: 'c2',
      project_id: 'p2',
      type: 'Feature',
      status: 'OPEN',
      title: 'Internal ticket',
      description: 'Desc',
      assignee_user_id: 'agent-2',
      created_by_user_id: 'a1',
      created_at: new Date(),
      updated_at: new Date(),
      comments: [],
      attachments: []
    });

    const service = makeService(prisma);

    const result = await service.createTicket(
      { sub: 'a1', roles: ['tiba_agent'], customerId: null, email: null },
      {
        projectId: 'p2',
        title: 'Internal ticket',
        description: 'Desc',
        type: 'Feature',
        assigneeUserId: 'agent-2'
      }
    );

    expect(tx.ticket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customer_id: 'c2',
          project_id: 'p2',
          assignee_user_id: 'agent-2'
        })
      })
    );
    expect(result.customerId).toBe('c2');
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: 'ticket.created',
          payload_json: expect.objectContaining({ assigneeUserId: 'agent-2' })
        })
      })
    );
  });

  it('writes status_changed audit and outbox event on updateTicketStatus', async () => {
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

    const service = makeService(prisma);

    await service.updateTicketStatus(
      { sub: 'a1', roles: ['tiba_agent'], customerId: null, email: null },
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
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: 'ticket.status_changed',
          payload_json: { ticketId: 't1', customerId: 'c1', from: 'OPEN', to: 'IN_PROGRESS' }
        })
      })
    );
  });

  it('forbids customer_user from updating ticket status', async () => {
    const { prisma } = makePrismaMock();
    const service = makeService(prisma);

    await expect(
      service.updateTicketStatus(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1',
        { status: 'IN_PROGRESS' }
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for customer_user on cross-tenant ticket detail', async () => {
    const { prisma } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't1',
      customer_id: 'c2',
      comments: [],
      attachments: []
    });

    const service = makeService(prisma);

    await expect(
      service.getTicketById(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1'
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('writes assigned audit and outbox event on assignTicket', async () => {
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

    const service = makeService(prisma);

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
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: 'ticket.assigned',
          payload_json: { ticketId: 't1', customerId: 'c1', from: null, to: 'agent-1' }
        })
      })
    );
  });

  it('writes comment_added audit and outbox event on addComment', async () => {
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

    const service = makeService(prisma);

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
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: 'ticket.comment_added',
          payload_json: { ticketId: 't1', customerId: 'c1', commentId: 'cm1' }
        })
      })
    );
  });

  it('returns not found for customer_user adding comment to cross-tenant ticket', async () => {
    const { prisma } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', customer_id: 'c2' });

    const service = makeService(prisma);

    await expect(
      service.addComment(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1',
        { body: 'hello' }
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects disallowed mime when presigning upload', async () => {
    const { prisma } = makePrismaMock();
    const service = makeService(prisma);

    await expect(
      service.presignAttachmentUpload(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1',
        { filename: 'test.exe', mime: 'application/x-msdownload', sizeBytes: 100 }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects too-large attachment when presigning upload', async () => {
    const { prisma } = makePrismaMock();
    const service = makeService(prisma);

    await expect(
      service.presignAttachmentUpload(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1',
        { filename: 'test.pdf', mime: 'application/pdf', sizeBytes: 999999999 }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates attachment record and returns camelCase upload response plus outbox event', async () => {
    const { prisma, tx } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', customer_id: 'c1' });
    tx.ticketAttachment.create.mockResolvedValue({ id: 'a1' });
    tx.ticket.update.mockResolvedValue({});

    const service = makeService(prisma);

    const result = await service.presignAttachmentUpload(
      { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
      't1',
      { filename: 'My File.pdf', mime: 'application/pdf', sizeBytes: 1024 }
    );

    expect(tx.ticketAttachment.create).toHaveBeenCalled();
    expect(result).toHaveProperty('attachmentId');
    expect(result).toHaveProperty('objectKey');
    expect(result).toHaveProperty('uploadUrl', 'https://upload.example');
    expect(result).toHaveProperty('requiredHeaders.Content-Type', 'application/pdf');
    expect(JSON.stringify(result)).not.toContain('object_key');
    expect(JSON.stringify(result)).not.toContain('size_bytes');
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'attachment_added' })
      })
    );
    expect(tx.outboxEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          topic: 'ticket.attachment_added',
          payload_json: expect.objectContaining({
            ticketId: 't1',
            customerId: 'c1',
            filename: 'My_File.pdf',
            mime: 'application/pdf',
            sizeBytes: 1024
          })
        })
      })
    );
  });

  it('returns not found for customer_user presign upload on cross-tenant ticket', async () => {
    const { prisma } = makePrismaMock();
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', customer_id: 'c2' });

    const service = makeService(prisma);

    await expect(
      service.presignAttachmentUpload(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1',
        { filename: 'test.pdf', mime: 'application/pdf', sizeBytes: 1024 }
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
