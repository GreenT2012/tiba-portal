import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
