import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'BAD_GATEWAY',
  'INTERNAL_SERVER_ERROR'
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    statusCode: z.number().int(),
    details: z.unknown().optional()
  })
});
export type ApiErrorContract = z.infer<typeof apiErrorSchema>;
