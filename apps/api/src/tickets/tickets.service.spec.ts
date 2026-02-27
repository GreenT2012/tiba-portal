import { BadRequestException } from '@nestjs/common';
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
    ticketAttachment: {
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
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn()
    },
    ticketAttachment: {
      findFirst: jest.fn()
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

describe('TicketsService audit logging', () => {
  it('writes created audit event on createTicket', async () => {
    const { prisma, tx } = makePrismaMock();
    const storage = makeStorageMock();
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

    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

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
    const storage = makeStorageMock();
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

    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

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
    const storage = makeStorageMock();
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

    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

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
    const storage = makeStorageMock();
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

    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

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

  it('rejects disallowed mime when presigning upload', async () => {
    const { prisma } = makePrismaMock();
    const storage = makeStorageMock();
    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

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
    const storage = makeStorageMock();
    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

    await expect(
      service.presignAttachmentUpload(
        { sub: 'u1', roles: ['customer_user'], customerId: 'c1', email: null },
        't1',
        { filename: 'test.pdf', mime: 'application/pdf', sizeBytes: 999999999 }
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates attachment record and returns camelCase upload response', async () => {
    const { prisma, tx } = makePrismaMock();
    const storage = makeStorageMock();
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', customer_id: 'c1' });
    tx.ticketAttachment.create.mockResolvedValue({ id: 'a1' });
    tx.ticket.update.mockResolvedValue({});

    const service = new TicketsService(prisma as any, new AuditService(prisma as any), storage as any);

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
  });
});
