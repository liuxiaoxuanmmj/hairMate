import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { analyzeSources, checkClientPackages, checkRepository, checkTestFiles } from '../../scripts/check-architecture.mjs';
import { checkMobileBuild, checkSourceMap } from '../../scripts/check-mobile-build.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary: string[] = [];
afterEach(() => { for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true }); });
function fixture(entries: Record<string, string>) {
  const directory = mkdtempSync(path.join(root, 'node_modules/hairmate-architecture-'));
  temporary.push(directory);
  const files = Object.entries(entries).map(([name, content]) => {
    const file = path.join(directory, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
    return file;
  });
  return { directory, files };
}
const modulePath = (module: string, file: string) => `packages/server/src/modules/${module}/${file}`;

test('legal Port, Adapter and public workflow dependency graph passes', () => {
  const { directory, files } = fixture({
    [modulePath('profiles', 'ports/profile.ts')]: 'export interface ProfilePort { read(): string; }',
    [modulePath('profiles', 'adapters/profile.ts')]: "import type { ProfilePort } from '../ports/profile.js'; export const createProfile = (): ProfilePort => ({ read: () => 'value' });",
    [modulePath('profiles', 'application/read.ts')]: "import type { ProfilePort } from '../ports/profile.js'; export const read = (port: ProfilePort) => port.read();",
    [modulePath('profiles', 'public.ts')]: "export { read } from './application/read.js';",
    'packages/server/src/workflows/query.ts': "import { read } from '../modules/profiles/public.js'; export { read };",
  });
  expect(analyzeSources(directory, files)).toEqual([]);
});

test.each(['public.ts', 'application/query.ts'])('module-to-module import is forbidden even through %s', (target) => {
  const { directory, files } = fixture({
    [modulePath('profiles', 'application/read.ts')]: `import { query } from '../../journeys/${target.replace('.ts', '.js')}'; export { query };`,
    [modulePath('journeys', target)]: 'export const query = () => 1;',
  });
  expect(analyzeSources(directory, files)).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'MODULE_BOUNDARY' })]));
});

test('path aliases and literal dynamic imports cannot bypass the module boundary', () => {
  const { directory, files } = fixture({
    [modulePath('profiles', 'application/read.ts')]: "export const read = () => import('@journey/query');",
    [modulePath('journeys', 'application/query.ts')]: 'export const query = () => 1;',
  });
  const diagnostics = analyzeSources(directory, files, { baseUrl: directory, paths: { '@journey/*': ['packages/server/src/modules/journeys/application/*'] } });
  expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ rule: 'MODULE_BOUNDARY' })]));
});

test('computed dynamic imports, unresolved modules and parse errors fail closed', () => {
  const { directory, files } = fixture({
    'packages/api-client/src/index.ts': "const target = './unknown.js'; export const load = () => import(target); import './missing.js';",
    'apps/mobile/src/invalid.ts': 'export const = ;',
  });
  const rules = analyzeSources(directory, files).map((entry) => entry.rule);
  expect(rules).toContain('DYNAMIC_IMPORT');
  expect(rules).toContain('RESOLUTION');
});

test('contracts cannot hide a transitive server re-export from the App', () => {
  const { directory, files } = fixture({
    'apps/mobile/src/index.ts': "export * from '../../../packages/contracts/src/index.js';",
    'packages/contracts/src/index.ts': "export * from './bridge.js';",
    'packages/contracts/src/bridge.ts': "export * from '../../server/src/composition/config.js';",
    'packages/server/src/composition/config.ts': 'export const database = 1;',
  });
  expect(analyzeSources(directory, files).map((entry) => entry.rule)).toEqual(expect.arrayContaining(['CLIENT_BOUNDARY', 'CONTRACT_PURITY']));
});

test('private exports and outward domain dependencies are rejected', () => {
  const { directory, files } = fixture({
    [modulePath('profiles', 'public.ts')]: "export * from './adapters/repository.js';",
    [modulePath('profiles', 'adapters/repository.ts')]: 'export const repository = 1;',
    [modulePath('profiles', 'domain/read.ts')]: "import pg from 'pg'; import { repository } from '../adapters/repository.js'; export { repository, pg };",
  });
  expect(analyzeSources(directory, files).map((entry) => entry.rule)).toEqual(expect.arrayContaining(['PUBLIC_SURFACE', 'LAYER_DIRECTION', 'ADAPTER_PORT']));
});

test('runtime and tool handlers cannot call the top-level workflow', () => {
  const { directory, files } = fixture({
    'packages/server/src/workflows/top/run.ts': 'export const run = () => 1;',
    'packages/server/src/ai-runtime/run.ts': "export { run } from '../workflows/top/run.js';",
    'packages/server/src/workflows/tools/handler.ts': "export { run } from '../top/run.js';",
  });
  expect(analyzeSources(directory, files).filter((entry) => entry.rule === 'RUNTIME_LEAF')).toHaveLength(2);
});

test('cycles include re-export edges', () => {
  const { directory, files } = fixture({
    'packages/contracts/src/a.ts': "export * from './b.js'; export const a = 1;",
    'packages/contracts/src/b.ts': "export * from './a.js'; export const b = 2;",
  });
  expect(analyzeSources(directory, files).map((entry) => entry.rule)).toContain('CYCLE');
});

test('client Node APIs, environment aliases, mutable globals and Reserved packages fail', () => {
  const { directory, files } = fixture({
    'apps/mobile/src/bad.ts': "import 'node:fs'; import 'expo-location'; const env = process.env; export let registry = env;",
  });
  expect(analyzeSources(directory, files).map((entry) => entry.rule)).toEqual(expect.arrayContaining(['CLIENT_BOUNDARY', 'ENV_BOUNDARY', 'COMPOSITION', 'PROJECT_SCOPE']));
});

test('transitive package closure checks dependencies beyond App imports', () => {
  const { directory } = fixture({
    'package.json': JSON.stringify({ name: 'fixture', dependencies: { bridge: '1.0.0' } }),
    'node_modules/bridge/package.json': JSON.stringify({ name: 'bridge', dependencies: { pg: '8.23.0' } }),
  });
  expect(checkClientPackages(path.join(directory, 'package.json'))).toContain('Forbidden transitive dependency: pg');
});

test('source-map checker rejects server code and missing build artifacts', () => {
  expect(() => checkSourceMap({ sources: ['apps/mobile/app/index.tsx', 'packages/contracts/src/index.ts'] })).not.toThrow();
  expect(() => checkSourceMap({ sources: ['../../packages/server/src/composition/index.ts'] })).toThrow('Server code');
  expect(() => checkSourceMap({ sources: ['node_modules/.pnpm/pg@8.23.0/node_modules/pg/lib/index.js'] })).toThrow('Server code');
  expect(() => checkSourceMap({ sources: [] })).toThrow('Missing');
  expect(() => checkSourceMap({ sources: ['app.ts'], sourcesContent: ['HAIRMATE_SERVER_ONLY_SENTINEL'] })).toThrow('sentinel');
  const { directory } = fixture({});
  expect(() => checkMobileBuild(directory)).toThrow();
  expect(() => checkRepository(directory)).toThrow();
});

test('disabled tests are rejected while actual cases are accepted', () => {
  const valid = fixture({ 'tests/unit/valid.test.ts': "test('runs', () => {});" });
  expect(checkTestFiles(valid.directory, valid.files)).toEqual([]);
  const invalid = fixture({ 'tests/unit/invalid.test.ts': "test.skip('disabled', () => {}); test.todo('missing'); test.only('exclusive', () => {});" });
  expect(checkTestFiles(invalid.directory, invalid.files)).toHaveLength(3);
});

test('undeclared modules and runtime directories are rejected in an otherwise valid baseline', () => {
  const sources = Object.fromEntries(['apps/mobile/app', 'apps/mobile/src', 'apps/api/src', 'apps/worker/src', 'packages/contracts/src', 'packages/api-client/src', 'packages/server/src/composition'].map((directory) => [`${directory}/index.ts`, 'export {};']));
  const entries = { ...sources, 'apps/mobile/package.json': '{"name":"mobile","dependencies":{}}', 'tests/unit/valid.test.ts': "test('case', () => {});" };
  const valid = fixture(entries);
  expect(checkRepository(valid.directory).diagnostics).toEqual([]);
  const invalid = fixture({ ...entries, 'packages/server/src/modules/billing/public.ts': 'export {};', 'packages/server/src/ai-runtime/unapproved.ts': 'export {};', 'apps/chat/index.ts': 'export {};' });
  expect(checkRepository(invalid.directory).diagnostics.filter((entry) => entry.rule === 'PROJECT_SCOPE')).toHaveLength(3);
});
