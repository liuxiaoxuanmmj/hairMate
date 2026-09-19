import { z } from 'zod';

export const liveResponseSchema = z.strictObject({ status: z.literal('ok') });
export const readyResponseSchema = z.strictObject({ status: z.literal('ready') });
export type ReadyResponse = Readonly<z.infer<typeof readyResponseSchema>>;

// Only errors used by the current transport baseline are registered here.
export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(['VALIDATION_FAILED', 'RESOURCE_NOT_FOUND', 'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR']),
    message: z.string().min(1).max(200),
    retryable: z.boolean(),
  }),
  requestId: z.string().min(1).max(100),
});
export type ErrorResponse = Readonly<z.infer<typeof errorResponseSchema>>;

export const healthHttpSchemas = {
  querystring: z.toJSONSchema(z.strictObject({}), { target: 'draft-7' }),
  live: z.toJSONSchema(liveResponseSchema, { target: 'draft-7' }),
  ready: z.toJSONSchema(readyResponseSchema, { target: 'draft-7' }),
  error: z.toJSONSchema(errorResponseSchema, { target: 'draft-7' }),
} as const;
