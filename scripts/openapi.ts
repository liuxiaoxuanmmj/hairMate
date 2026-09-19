import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthHttpSchemas } from '../packages/contracts/src/index.js';

export function createOpenApiDocument() {
  const response = (description: string, schema: object) => ({ description, content: { 'application/json': { schema } } });
  return {
    openapi: '3.1.0',
    info: { title: 'HairMate baseline health API', version: '0.0.0', description: '仅描述当前健康接口；尚无个人资源、认证或业务生成接口。' },
    paths: {
      '/health/live': { get: { operationId: 'checkLiveness', responses: { '200': response('Process is running', healthHttpSchemas.live), '400': response('Invalid input', healthHttpSchemas.error) } } },
      '/health/ready': { get: { operationId: 'checkReadiness', responses: { '200': response('Required database is ready', healthHttpSchemas.ready), '400': response('Invalid input', healthHttpSchemas.error), '503': response('Dependency unavailable', healthHttpSchemas.error), '500': response('Internal failure', healthHttpSchemas.error) } } },
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../openapi.json', import.meta.url), `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`);
}
