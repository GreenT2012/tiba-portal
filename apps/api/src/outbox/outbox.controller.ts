import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { DispatchOutboxDto } from './dto/dispatch-outbox.dto';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import type { OutboxDispatchSummary, OutboxStats } from './outbox.types';

@ApiTags('outbox')
@Controller('outbox')
export class OutboxController {
  constructor(private readonly outboxDispatcherService: OutboxDispatcherService) {}

  @Roles('tiba_admin')
  @ApiOperation({ summary: 'Dispatch pending outbox events' })
  @ApiBody({ type: DispatchOutboxDto, required: false })
  @ApiOkResponse({
    schema: {
      properties: {
        requested: { type: 'number' },
        claimed: { type: 'number' },
        processed: { type: 'number' },
        failed: { type: 'number' },
        skipped: { type: 'number' }
      }
    }
  })
  @Post('dispatch')
  dispatch(@Body() dto: DispatchOutboxDto): Promise<OutboxDispatchSummary> {
    return this.outboxDispatcherService.dispatchPending(dto.batchSize ?? 20);
  }

  @Roles('tiba_admin')
  @ApiOperation({ summary: 'Read current outbox stats' })
  @ApiOkResponse({
    schema: {
      properties: {
        pending: { type: 'number' },
        processing: { type: 'number' },
        processed: { type: 'number' },
        failed: { type: 'number' },
        retryableFailed: { type: 'number' },
        exhaustedFailed: { type: 'number' },
        failedByTopic: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              count: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @Get('stats')
  stats(): Promise<OutboxStats> {
    return this.outboxDispatcherService.getStats();
  }
}
