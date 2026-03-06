import { normalizeProxyResponse } from '../../../../apps/web/lib/bff';
import { buildApiErrorEnvelope, readApiError } from '../../../../apps/web/lib/api';

function makeResponse(body: string, options?: { status?: number; statusText?: string; contentType?: string }) {
  return {
    status: options?.status ?? 500,
    statusText: options?.statusText ?? 'Server Error',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return options?.contentType ?? null;
        }
        return null;
      }
    },
    text: async () => body
  } as unknown as Response;
}

describe('Web integration contracts', () => {
  it('builds stable API error envelopes', () => {
    expect(buildApiErrorEnvelope(404, 'Ticket not found')).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Ticket not found',
        statusCode: 404
      }
    });
  });

  it('reads standardized API errors for web display', async () => {
    const response = makeResponse(
      JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message: 'Missing required role',
          statusCode: 403
        }
      }),
      { status: 403, contentType: 'application/json' }
    );

    await expect(readApiError(response, 'Fallback')).resolves.toBe('403: Missing required role');
  });

  it('reads legacy JSON error payloads as fallback', async () => {
    const response = makeResponse(JSON.stringify({ error: 'BFF proxy failed', detail: 'boom' }), {
      status: 500,
      contentType: 'application/json'
    });

    await expect(readApiError(response, 'Fallback')).resolves.toBe('500: BFF proxy failed (boom)');
  });

  it('preserves valid API error envelopes through BFF normalization', () => {
    const body = {
      error: {
        code: 'NOT_FOUND',
        message: 'Ticket not found',
        statusCode: 404
      }
    };

    expect(
      normalizeProxyResponse({
        status: 404,
        contentType: 'application/json',
        raw: JSON.stringify(body),
        statusText: 'Not Found'
      })
    ).toEqual({
      kind: 'json',
      body,
      status: 404
    });
  });

  it('normalizes non-standard upstream JSON errors into the shared error envelope', () => {
    expect(
      normalizeProxyResponse({
        status: 502,
        contentType: 'application/json',
        raw: JSON.stringify({ error: 'upstream failed' }),
        statusText: 'Bad Gateway'
      })
    ).toEqual({
      kind: 'json',
      body: {
        error: {
          code: 'BAD_GATEWAY',
          message: 'upstream failed',
          statusCode: 502
        }
      },
      status: 502
    });
  });

  it('normalizes non-JSON upstream errors into the shared error envelope', () => {
    expect(
      normalizeProxyResponse({
        status: 500,
        contentType: 'text/plain',
        raw: 'database unavailable',
        statusText: 'Internal Server Error'
      })
    ).toEqual({
      kind: 'json',
      body: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'database unavailable',
          statusCode: 500
        }
      },
      status: 500
    });
  });
});
