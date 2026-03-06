import { apiErrorSchema, type ApiErrorCode } from '@tiba/shared/errors';

const STATUS_TO_CODE: Partial<Record<number, ApiErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  502: 'BAD_GATEWAY',
  500: 'INTERNAL_SERVER_ERROR'
};

export function buildApiErrorEnvelope(statusCode: number, message: string, details?: unknown) {
  return {
    error: {
      code: STATUS_TO_CODE[statusCode] ?? 'INTERNAL_SERVER_ERROR',
      message,
      statusCode,
      ...(details !== undefined ? { details } : {})
    }
  };
}

export async function readApiError(response: Response, fallback: string): Promise<string> {
  const raw = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const message = extractApiErrorMessage(raw, contentType, fallback, response.statusText);
  return `${response.status}: ${message}`;
}

function extractApiErrorMessage(raw: string, contentType: string, fallback: string, statusText: string): string {
  const trimmed = raw.trim();

  if (trimmed && contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const envelope = apiErrorSchema.safeParse(parsed);
      if (envelope.success) {
        return envelope.data.error.message;
      }

      if (typeof parsed === 'object' && parsed !== null) {
        const legacy = parsed as { error?: unknown; detail?: unknown; message?: unknown };
        if (typeof legacy.error === 'string' && typeof legacy.detail === 'string') {
          return `${legacy.error} (${legacy.detail})`;
        }
        if (typeof legacy.error === 'string') {
          return legacy.error;
        }
        if (typeof legacy.message === 'string') {
          return legacy.message;
        }
      }
    } catch {
      return trimmed;
    }
  }

  if (trimmed) {
    return trimmed;
  }

  return fallback || statusText || 'Request failed';
}
