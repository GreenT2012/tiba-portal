import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxService } from './outbox.service';
import type { DispatchableOutboxEvent } from './outbox.types';

function makeEvent(overrides: Partial<DispatchableOutboxEvent> = {}): DispatchableOutboxEvent {
  return {
    id: 'evt-1',
    topic: 'ticket.created',
    aggregateType: 'ticket',
    aggregateId: 't1',
    customerId: 'c1',
    payload: { ticketId: 't1', customerId: 'c1', projectId: 'p1', type: 'Bug', status: 'OPEN', assigneeUserId: null },
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    createdAt: new Date(),
    publishedAt: null,
    nextRetryAt: null,
    ...overrides
  };
}

describe('OutboxDispatcherService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OUTBOX_MAX_ATTEMPTS: '3',
      OUTBOX_RETRY_DELAY_MS: '1000',
      OUTBOX_DISPATCH_BATCH_SIZE: '10'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('claims and processes pending events successfully', async () => {
    const outboxService = {
      listProcessable: jest.fn().mockResolvedValue([makeEvent()]),
      claimForProcessing: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn()
    } as unknown as jest.Mocked<OutboxService>;
    const handler = {
      supports: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined)
    };

    const service = new OutboxDispatcherService(outboxService, [handler]);
    const result = await service.dispatchPending();

    expect(result).toEqual({ requested: 10, claimed: 1, processed: 1, failed: 0, exhausted: 0, skipped: 0 });
    expect(outboxService.listProcessable).toHaveBeenCalledWith(10, 3);
    expect(handler.handle).toHaveBeenCalledWith(expect.objectContaining({ id: 'evt-1', topic: 'ticket.created' }));
    expect(outboxService.markProcessed).toHaveBeenCalledWith('evt-1');
    expect(outboxService.markFailed).not.toHaveBeenCalled();
  });

  it('marks event as failed with retry window when handler throws below max attempts', async () => {
    const outboxService = {
      listProcessable: jest.fn().mockResolvedValue([makeEvent({ attempts: 0 })]),
      claimForProcessing: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn()
    } as unknown as jest.Mocked<OutboxService>;
    const handler = {
      supports: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockRejectedValue(new Error('boom'))
    };

    const service = new OutboxDispatcherService(outboxService, [handler]);
    const result = await service.dispatchPending(5);

    expect(result).toEqual({ requested: 5, claimed: 1, processed: 0, failed: 1, exhausted: 0, skipped: 0 });
    expect(outboxService.markFailed).toHaveBeenCalledWith('evt-1', 'boom', expect.any(Date));
    expect(outboxService.markProcessed).not.toHaveBeenCalled();
  });

  it('stops retry scheduling when max attempts is reached', async () => {
    const outboxService = {
      listProcessable: jest.fn().mockResolvedValue([makeEvent({ attempts: 2 })]),
      claimForProcessing: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn()
    } as unknown as jest.Mocked<OutboxService>;
    const handler = {
      supports: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockRejectedValue(new Error('boom'))
    };

    const service = new OutboxDispatcherService(outboxService, [handler]);
    const result = await service.dispatchPending(1);

    expect(result).toEqual({ requested: 1, claimed: 1, processed: 0, failed: 1, exhausted: 1, skipped: 0 });
    expect(outboxService.markFailed).toHaveBeenCalledWith('evt-1', 'boom', null);
  });

  it('marks event as failed when no handler supports the topic', async () => {
    const outboxService = {
      listProcessable: jest.fn().mockResolvedValue([makeEvent({ topic: 'unknown.topic' })]),
      claimForProcessing: jest.fn().mockResolvedValue(true),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn()
    } as unknown as jest.Mocked<OutboxService>;
    const handler = {
      supports: jest.fn().mockReturnValue(false),
      handle: jest.fn().mockResolvedValue(undefined)
    };

    const service = new OutboxDispatcherService(outboxService, [handler]);
    const result = await service.dispatchPending(1);

    expect(result).toEqual({ requested: 1, claimed: 1, processed: 0, failed: 1, exhausted: 0, skipped: 0 });
    expect(outboxService.markFailed).toHaveBeenCalledWith('evt-1', 'No outbox handler registered for topic unknown.topic', expect.any(Date));
  });

  it('skips an event when claiming loses the race', async () => {
    const outboxService = {
      listProcessable: jest.fn().mockResolvedValue([makeEvent()]),
      claimForProcessing: jest.fn().mockResolvedValue(false),
      markProcessed: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn()
    } as unknown as jest.Mocked<OutboxService>;
    const handler = {
      supports: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined)
    };

    const service = new OutboxDispatcherService(outboxService, [handler]);
    const result = await service.dispatchPending(1);

    expect(result).toEqual({ requested: 1, claimed: 0, processed: 0, failed: 0, exhausted: 0, skipped: 1 });
    expect(handler.handle).not.toHaveBeenCalled();
    expect(outboxService.markProcessed).not.toHaveBeenCalled();
    expect(outboxService.markFailed).not.toHaveBeenCalled();
  });
});
