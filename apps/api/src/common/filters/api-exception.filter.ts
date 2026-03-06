import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

type ErrorPayload = {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.toPayload(exception, status);

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json(payload);
  }

  private toPayload(exception: unknown, status: number): ErrorPayload {
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        const message = typeof body.message === 'string' ? body.message : 'Bad request';
        const details = Array.isArray(body.message) ? body.message : body.details;
        return {
          error: {
            code: 'BAD_REQUEST',
            message,
            statusCode: status,
            ...(details !== undefined ? { details } : {})
          }
        };
      }
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return {
          error: {
            code: this.codeForStatus(status),
            message: response,
            statusCode: status
          }
        };
      }

      if (typeof response === 'object' && response !== null) {
        const body = response as Record<string, unknown>;
        const messageValue = body.message;
        const message =
          typeof messageValue === 'string'
            ? messageValue
            : Array.isArray(messageValue)
              ? 'Validation failed'
              : exception.message;

        return {
          error: {
            code: typeof body.code === 'string' ? body.code : this.codeForStatus(status),
            message,
            statusCode: status,
            ...(body.details !== undefined
              ? { details: body.details }
              : Array.isArray(messageValue)
                ? { details: messageValue }
                : {})
          }
        };
      }
    }

    return {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        statusCode: status
      }
    };
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.BAD_GATEWAY:
        return 'BAD_GATEWAY';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
