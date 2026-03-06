import { apiErrorSchema } from '@tiba/shared';
import { buildApiErrorEnvelope } from './api';

export type NormalizedProxyResult =
  | {
      kind: 'json';
      body: unknown;
      status: number;
    }
  | {
      kind: 'text';
      body: string;
      status: number;
      contentType?: string;
    };

export function normalizeProxyResponse(input: {
  status: number;
  contentType: string;
  raw: string;
  statusText: string;
}): NormalizedProxyResult {
  const { status, contentType, raw, statusText } = input;

  if (contentType.includes('application/json')) {
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      if (status >= 400) {
        const envelope = apiErrorSchema.safeParse(parsed);
        if (envelope.success) {
          return { kind: 'json', body: parsed, status };
        }

        return {
          kind: 'json',
          body: buildApiErrorEnvelope(status, extractProxyErrorMessage(parsed, raw, statusText)),
          status
        };
      }

      return { kind: 'json', body: parsed, status };
    } catch {
      if (status >= 400) {
        return {
          kind: 'json',
          body: buildApiErrorEnvelope(status, raw || statusText || 'Upstream request failed'),
          status
        };
      }

      return {
        kind: 'text',
        body: raw,
        status,
        contentType: 'text/plain; charset=utf-8'
      };
    }
  }

  if (status >= 400) {
    return {
      kind: 'json',
      body: buildApiErrorEnvelope(status, raw || statusText || 'Upstream request failed'),
      status
    };
  }

  return {
    kind: 'text',
    body: raw,
    status,
    ...(contentType ? { contentType } : {})
  };
}

export function extractProxyErrorMessage(parsed: unknown, raw: string, statusText: string) {
  if (typeof parsed === 'object' && parsed !== null) {
    const legacy = parsed as { error?: unknown; message?: unknown; detail?: unknown };
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

  return raw || statusText || 'Upstream request failed';
}
