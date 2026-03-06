import { BadRequestException, ArgumentsHost, ForbiddenException, Logger } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';

function createHost() {
  const json = jest.fn();
  const statusResult = { json };
  const status = jest.fn(() => statusResult);

  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/api/v1/test' })
      })
    } as unknown as ArgumentsHost,
    status,
    json
  };
}

describe('ApiExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats bad request exceptions in stable error shape', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();
    const exception = new BadRequestException({
      message: 'Validation failed',
      details: ['field must not be empty']
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed',
        statusCode: 400,
        details: ['field must not be empty']
      }
    });
  });

  it('formats non-bad-request http exceptions with status-based codes', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new ForbiddenException('Missing required role'), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'FORBIDDEN',
        message: 'Missing required role',
        statusCode: 403
      }
    });
  });

  it('hides raw internal errors behind the stable 500 envelope', () => {
    const filter = new ApiExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new global.Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        statusCode: 500
      }
    });
  });
});
