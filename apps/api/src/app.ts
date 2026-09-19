import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthHttpSchemas, type ErrorResponse } from '@hairmate/contracts';
import type { AppConfig, HealthDependency } from '@hairmate/server/composition';

export function createApp(config: AppConfig, database: HealthDependency) {
  const app = Fastify({
    logger: false,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    bodyLimit: 16_384,
    requestTimeout: 15_000,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false, useDefaults: false } },
  });
  void app.register(cors, { origin: config.API_ALLOWED_ORIGIN, methods: ['GET'], credentials: false });
  const errorBody = (code: ErrorResponse['error']['code'], requestId: string): ErrorResponse => ({
    error: {
      code,
      message: code === 'VALIDATION_FAILED' ? '请求格式有误。' : code === 'RESOURCE_NOT_FOUND' ? '未找到请求的资源。' : '服务暂时不可用。',
      retryable: code === 'SERVICE_UNAVAILABLE',
    },
    requestId,
  });
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    const invalid = (error instanceof Error && 'validation' in error) || (statusCode >= 400 && statusCode < 500);
    void reply.code(invalid ? 400 : 500).send(errorBody(invalid ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR', request.id));
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send(errorBody('RESOURCE_NOT_FOUND', request.id)));
  app.addHook('onSend', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
  app.get('/health/live', {
    schema: { querystring: healthHttpSchemas.querystring, response: { 200: healthHttpSchemas.live, 400: healthHttpSchemas.error } },
  }, async () => ({ status: 'ok' as const }));
  app.get('/health/ready', {
    schema: { querystring: healthHttpSchemas.querystring, response: { 200: healthHttpSchemas.ready, 503: healthHttpSchemas.error, 400: healthHttpSchemas.error } },
  }, async (request, reply) => {
    if (!await database.check()) return reply.code(503).send(errorBody('SERVICE_UNAVAILABLE', request.id));
    return { status: 'ready' as const };
  });
  app.addHook('onClose', async () => { await database.close(); });
  return app;
}
