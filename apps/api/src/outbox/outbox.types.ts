import type { OutboxStatus } from '@tiba/shared/events';

export type DispatchableOutboxEvent = {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  customerId: string | null;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  nextRetryAt: Date | null;
};

export type OutboxDispatchSummary = {
  requested: number;
  claimed: number;
  processed: number;
  failed: number;
  exhausted: number;
  skipped: number;
};

export type OutboxStats = {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  retryableFailed: number;
  exhaustedFailed: number;
  failedByTopic: Array<{ topic: string; count: number }>;
};
