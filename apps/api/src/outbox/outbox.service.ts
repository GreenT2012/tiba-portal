import { Prisma, type OutboxEvent } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DispatchableOutboxEvent, OutboxStats } from './outbox.types';

export type OutboxWriter = Pick<PrismaService, 'outboxEvent'>;

export type EnqueueOutboxEventInput = {
  topic: string;
  aggregateType: string;
  aggregateId: string;
  customerId?: string | null;
  payloadJson: Prisma.InputJsonValue;
};

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(input: EnqueueOutboxEventInput, writer: OutboxWriter = this.prisma) {
    return writer.outboxEvent.create({
      data: {
        topic: input.topic,
        aggregate_type: input.aggregateType,
        aggregate_id: input.aggregateId,
        customer_id: input.customerId ?? null,
        payload_json: input.payloadJson,
        status: 'PENDING'
      }
    });
  }

  async listProcessable(limit: number, maxAttempts: number, now = new Date()): Promise<DispatchableOutboxEvent[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        attempts: { lt: maxAttempts },
        OR: [{ next_retry_at: null }, { next_retry_at: { lte: now } }]
      },
      orderBy: [{ created_at: 'asc' }],
      take: limit
    });

    return events.map((event) => this.toDispatchableEvent(event));
  }

  async claimForProcessing(id: string): Promise<boolean> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        id,
        status: { in: ['PENDING', 'FAILED'] }
      },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        last_error: null,
        next_retry_at: null
      }
    });

    return result.count > 0;
  }

  markProcessed(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        published_at: new Date(),
        last_error: null,
        next_retry_at: null
      }
    });
  }

  markFailed(id: string, message: string, nextRetryAt: Date | null) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        published_at: null,
        last_error: message.slice(0, 1000),
        next_retry_at: nextRetryAt
      }
    });
  }

  async getStats(maxAttempts: number, now = new Date()): Promise<OutboxStats> {
    const [pending, processing, processed, failed, retryableFailed, exhaustedFailed, failedByTopic] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: 'PENDING' } }),
      this.prisma.outboxEvent.count({ where: { status: 'PROCESSING' } }),
      this.prisma.outboxEvent.count({ where: { status: 'PROCESSED' } }),
      this.prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.outboxEvent.count({
        where: {
          status: 'FAILED',
          attempts: { lt: maxAttempts },
          OR: [{ next_retry_at: null }, { next_retry_at: { lte: now } }]
        }
      }),
      this.prisma.outboxEvent.count({
        where: {
          status: 'FAILED',
          attempts: { gte: maxAttempts }
        }
      }),
      this.prisma.outboxEvent.groupBy({
        by: ['topic'],
        where: { status: 'FAILED' },
        _count: { topic: true }
      })
    ]);

    return {
      pending,
      processing,
      processed,
      failed,
      retryableFailed,
      exhaustedFailed,
      failedByTopic: failedByTopic.map((entry) => ({ topic: entry.topic, count: entry._count.topic }))
    };
  }

  private toDispatchableEvent(event: OutboxEvent): DispatchableOutboxEvent {
    return {
      id: event.id,
      topic: event.topic,
      aggregateType: event.aggregate_type,
      aggregateId: event.aggregate_id,
      customerId: event.customer_id,
      payload: event.payload_json,
      status: event.status as DispatchableOutboxEvent['status'],
      attempts: event.attempts,
      lastError: event.last_error,
      createdAt: event.created_at,
      publishedAt: event.published_at,
      nextRetryAt: event.next_retry_at
    };
  }
}
