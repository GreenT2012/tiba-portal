import type { z } from 'zod';
import { readApiError } from '@/lib/api';

export async function requestJson<TSchema extends z.ZodTypeAny>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  schema: TSchema,
  fallbackMessage: string
): Promise<z.infer<TSchema>> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await readApiError(response, fallbackMessage));
  }

  const json = (await response.json()) as unknown;
  return schema.parse(json);
}
