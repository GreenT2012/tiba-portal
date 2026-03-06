import { OutboxRunnerService } from './outbox-runner.service';
import type { OutboxDispatcherService } from './outbox-dispatcher.service';

describe('OutboxRunnerService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env = {
      ...originalEnv,
      OUTBOX_AUTO_DISPATCH: 'true',
      OUTBOX_POLL_INTERVAL_MS: '1000'
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('dispatches on startup and on interval', async () => {
    const dispatcher = {
      dispatchPending: jest.fn().mockResolvedValue({ requested: 20, claimed: 0, processed: 0, failed: 0, exhausted: 0, skipped: 0 }),
      getStats: jest.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        processed: 0,
        failed: 0,
        retryableFailed: 0,
        exhaustedFailed: 0,
        failedByTopic: []
      })
    } as unknown as jest.Mocked<OutboxDispatcherService>;

    const service = new OutboxRunnerService(dispatcher);
    service.onModuleInit();

    await Promise.resolve();
    await Promise.resolve();
    expect(dispatcher.dispatchPending).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatcher.dispatchPending).toHaveBeenCalledTimes(2);

    service.onModuleDestroy();
  });

  it('does not start automatic dispatch when disabled', async () => {
    process.env.OUTBOX_AUTO_DISPATCH = 'false';
    const dispatcher = {
      dispatchPending: jest.fn(),
      getStats: jest.fn()
    } as unknown as jest.Mocked<OutboxDispatcherService>;

    const service = new OutboxRunnerService(dispatcher);
    service.onModuleInit();

    jest.advanceTimersByTime(5000);
    await Promise.resolve();

    expect(dispatcher.dispatchPending).not.toHaveBeenCalled();
  });
});
