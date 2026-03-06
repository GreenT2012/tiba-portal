import type { DispatchableOutboxEvent } from './outbox.types';

export interface OutboxEventHandler {
  supports(topic: string): boolean;
  handle(event: DispatchableOutboxEvent): Promise<void>;
}
