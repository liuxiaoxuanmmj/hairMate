import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { builtinModules, createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const businessMODULES = ['identity', 'profiles', 'journeys', 'styling', 'simulations', 'briefs', 'haircuts', 'media', 'consultations', 'ai-operations'];
export const ruleIds = ['PROJECT_SCOPE', 'RESOLUTION', 'DYNAMIC_IMPORT', 'MODULE_BOUNDARY', 'PUBLIC_SURFACE', 'LAYER_DIRECTION', 'ADAPTER_PORT', 'CLIENT_BOUNDARY', 'CONTRACT_PURITY', 'CYCLE', 'RUNTIME_LEAF', 'COMPOSITION', 'ENV_BOUNDARY', 'NO_SKIPPED_TESTS'];
const forbiddenPackages = new Set(['fastify', 'pg', 'pg-pool', 'drizzle-orm', 'pg-boss', 'better-auth', 'ai', 'ali-oss', 'openai', '@alicloud/oss-sdk']);
const forbiddenPlatforms = new Set(['kafkajs', 'amqplib', 'ioredis', 'eventemitter3', 'inversify', 'tsyringe', 'awilix', 'stripe', 'mapbox-gl', 'expo-notifications', 'expo-location']);
const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));
const normalize = (file) => file.split(path.sep).join('/');
const packageName = (specifier) => specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
const isBuiltin = (name) => name.startsWith('node:') || builtins.has(name);
const isServerPackage = (name) => forbiddenPackages.has(name.replace(/^@types\//, '')) || name.startsWith('@ai-sdk/') || name.startsWith('@aws-sdk/') || name.startsWith('@alicloud/');
function resolvedPackageName(file) {
  let directory = path.dirname(file);
  while (!existsSync(path.join(directory, 'package.json'))) {
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('Resolved dependency has no manifest.');
    directory = parent;
  }
  return JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')).name;
}
const info = (file) => ({
  module: /^packages\/server\/src\/modules\/([^/]+)\//.exec(file)?.[1],
  layer: /^packages\/server\/src\/modules\/[^/]+\/([^/]+)\//.exec(file)?.[1],
  client: /^(apps\/mobile\/(app|src)|packages\/(contracts|api-client)\/src)\//.test(file),
  workflow: file.startsWith('packages/server/src/workflows/'),
  composition: file.startsWith('packages/server/src/composition/'),
  runtime: file.startsWith('packages/server/src/ai-runtime/'),
});

export function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.expo') return [];
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unreviewed source symlink: ${file}`);
    return entry.isDirectory() ? sourceFiles(file) : /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [file] : [];
  });
}

// Compiler resolution handles aliases, package exports, .js -> .ts, and re-exports.
// Fixtures call the same analyzer as lint; there is no separate permissive test checker.
export function analyzeSources(root, files, options = {}) {
  const diagnostics = [];
  const graph = new Map();
  const compilerOptions = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, customConditions: ['development', 'react-native'], ...options };
  const relative = (file) => normalize(path.relative(root, file));
  const add = (rule, file, detail) => diagnostics.push({ rule, file: relative(file), detail });
  const fileSet = new Set(files.map((file) => path.resolve(file)));
  for (const file of files) {
    const from = relative(file);
    const fromInfo = info(from);
    const content = readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) add('RESOLUTION', file, 'Invalid syntax.');
    const edges = [];
    const dependencies = [];
    const record = (specifier, exported = false) => {
      if (typeof specifier !== 'string') { add('DYNAMIC_IMPORT', file, 'Import target must be statically resolvable.'); return; }
      const name = packageName(specifier);
      if (forbiddenPlatforms.has(name) || specifier.includes('real_photo_scene')) add('PROJECT_SCOPE', file, `Unregistered capability: ${name}`);
      if (isBuiltin(specifier)) {
        if (fromInfo.client) add('CLIENT_BOUNDARY', file, `Node API: ${specifier}`);
        if (['domain', 'application', 'ports'].includes(fromInfo.layer) || fromInfo.workflow) add('LAYER_DIRECTION', file, `Node API: ${specifier}`);
        return;
      }
      const resolved = ts.resolveModuleName(specifier, file, compilerOptions, ts.sys).resolvedModule;
      if (!resolved) { add('RESOLUTION', file, `Unresolved import: ${specifier}`); return; }
      const target = realpathSync(resolved.resolvedFileName);
      const to = relative(target);
      const toInfo = info(to);
      const external = !fileSet.has(target) && normalize(target).includes('/node_modules/');
      dependencies.push({ to, toInfo, exported, external });
      if (external) {
        const resolvedName = resolvedPackageName(target);
        if (forbiddenPlatforms.has(resolvedName)) add('PROJECT_SCOPE', file, `Unregistered dependency: ${resolvedName}`);
        if (fromInfo.client && isServerPackage(resolvedName)) add('CLIENT_BOUNDARY', file, `Server dependency: ${resolvedName}`);
        if (from.startsWith('packages/contracts/src/') && resolvedName !== 'zod') add('CONTRACT_PURITY', file, `Non-contract dependency: ${resolvedName}`);
        if ((['domain', 'application', 'ports'].includes(fromInfo.layer) || fromInfo.workflow || fromInfo.runtime) && resolvedName !== 'zod') add('LAYER_DIRECTION', file, `Implementation dependency: ${resolvedName}`);
        return;
      }
      if (!fileSet.has(target)) add('RESOLUTION', file, `Import escapes checked sources: ${to}`);
      edges.push(target);
      if (fromInfo.client && !toInfo.client) add('CLIENT_BOUNDARY', file, `Server or unchecked client dependency: ${to}`);
      if (from.startsWith('packages/contracts/src/') && !to.startsWith('packages/contracts/src/')) add('CONTRACT_PURITY', file, `Contracts depend on implementation: ${to}`);
      if (from.startsWith('packages/api-client/src/') && to.startsWith('apps/')) add('CLIENT_BOUNDARY', file, 'API client depends on an App.');
      if (fromInfo.module && toInfo.module && fromInfo.module !== toInfo.module) add('MODULE_BOUNDARY', file, `MODULE-to-module import: ${to}`);
      if (toInfo.module && !fromInfo.module && !fromInfo.composition && !(fromInfo.workflow && to.endsWith('/public.ts'))) add('MODULE_BOUNDARY', file, `Only workflows may consume public.ts: ${to}`);
      if (from.endsWith('/public.ts') && exported && (toInfo.layer === 'adapters' || toInfo.layer === 'ports')) add('PUBLIC_SURFACE', file, `Private export: ${to}`);
      if (['domain', 'application', 'ports'].includes(fromInfo.layer) && (toInfo.layer === 'adapters' || /\/(infrastructure|composition|workflows|ai-runtime)\//.test(to))) add('LAYER_DIRECTION', file, `Outward dependency: ${to}`);
      if (fromInfo.workflow && !toInfo.module && /\/(adapters|composition)\//.test(to)) add('LAYER_DIRECTION', file, `Workflow uses implementation: ${to}`);
      if (fromInfo.runtime && (toInfo.workflow || /\/tools\//.test(to) || toInfo.composition || toInfo.module)) add('RUNTIME_LEAF', file, `Runtime bypasses injected interface: ${to}`);
      if (/\/tools\//.test(from) && toInfo.workflow && !to.startsWith('packages/server/src/workflows/leaf/')) add('RUNTIME_LEAF', file, `Tool imports non-leaf workflow: ${to}`);
    };
    const visit = (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) record(ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined, ts.isExportDeclaration(node));
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        const expression = node.moduleReference.expression;
        record(expression && ts.isStringLiteral(expression) ? expression.text : undefined);
      } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        record(node.argument.literal.text);
      } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        record(argument && ts.isStringLiteralLike(argument) ? argument.text : undefined);
      }
      if (ts.isIdentifier(node) && ['eval', 'Function'].includes(node.text) && (ts.isCallExpression(node.parent) || ts.isNewExpression(node.parent)) && node.parent.expression === node) add('DYNAMIC_IMPORT', file, 'Runtime code evaluation is forbidden.');
      if (ts.isIdentifier(node) && node.text === 'process') {
        const entry = /^apps\/(api|worker)\/src\/main\.ts$/.test(from);
        const publicAddress = from === 'apps/mobile/src/platform/api.ts' && ts.isPropertyAccessExpression(node.parent) && node.parent.name.text === 'env' && ts.isPropertyAccessExpression(node.parent.parent) && node.parent.parent.name.text === 'EXPO_PUBLIC_API_URL';
        if (!entry && !publicAddress) add('ENV_BOUNDARY', file, 'Environment is read only at composition / public App config.');
      }
      if (from.endsWith('/public.ts') && ts.isExportDeclaration(node) && node.exportClause && /Repository|Adapter|Table|Connection|Pool/.test(node.exportClause.getText(ast))) add('PUBLIC_SURFACE', file, 'Public export contains a private capability.');
      if (node.parent === ast && ts.isVariableStatement(node) && !(node.declarationList.flags & ts.NodeFlags.Const)) add('COMPOSITION', file, 'Writable module-level state.');
      if (node.parent === ast && ts.isVariableStatement(node) && node.declarationList.declarations.some((declaration) => declaration.initializer && ts.isNewExpression(declaration.initializer))) add('COMPOSITION', file, 'Instances must be created inside an explicit composition function.');
      ts.forEachChild(node, visit);
    };
    visit(ast);
    if (fromInfo.layer === 'adapters' && !dependencies.some(({ toInfo }) => toInfo.module === fromInfo.module && toInfo.layer === 'ports')) add('ADAPTER_PORT', file, 'Adapter must depend on its own Port.');
    graph.set(path.resolve(file), edges);
  }
  const visiting = new Set();
  const visited = new Set();
  const walk = (file) => {
    if (visiting.has(file)) { add('CYCLE', file, 'Dependency cycle.'); return; }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const target of graph.get(file) ?? []) walk(target);
    visiting.delete(file);
    visited.add(file);
  };
  for (const file of graph.keys()) walk(file);
  return diagnostics;
}

// Walk production package dependencies, including dependencies reached via re-exports.
// Build source-map checks additionally inspect what Metro actually included.
export function checkClientPackages(manifestPath, visited = new Set()) {
  const absolute = realpathSync(manifestPath);
  if (visited.has(absolute)) return [];
  visited.add(absolute);
  const manifest = JSON.parse(readFileSync(absolute, 'utf8'));
  const problems = [];
  const require = createRequire(absolute);
  for (const name of Object.keys(manifest.dependencies ?? {})) {
    if (isServerPackage(name) || forbiddenPlatforms.has(name)) problems.push(`Forbidden transitive dependency: ${name}`);
    const dependency = (require.resolve.paths(name) ?? [])
      .map((directory) => path.join(directory, name, 'package.json')).find((candidate) => existsSync(candidate));
    if (!dependency) throw new Error(`Missing dependency manifest: ${name}`);
    problems.push(...checkClientPackages(dependency, visited));
  }
  return problems;
}

export function checkRepository(root) {
  const roots = ['apps/mobile/app', 'apps/mobile/src', 'apps/api/src', 'apps/worker/src', 'packages/contracts/src', 'packages/api-client/src', 'packages/server/src'];
  const files = roots.flatMap((directory) => sourceFiles(path.join(root, directory))).filter((file) => !/\.test\./.test(file));
  const diagnostics = analyzeSources(root, files);
  for (const [directory, allowed] of [['apps', ['api', 'worker', 'mobile']], ['packages', ['contracts', 'api-client', 'server']]]) {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      if (!allowed.includes(entry.name)) diagnostics.push({ rule: 'PROJECT_SCOPE', file: directory, detail: `Unregistered workspace: ${entry.name}` });
    }
  }
  const modulesDir = path.join(root, 'packages/server/src/modules');
  if (existsSync(modulesDir)) {
    for (const entry of readdirSync(modulesDir)) {
      diagnostics.push({ rule: 'PROJECT_SCOPE', file: modulesDir, detail: businessMODULES.includes(entry) ? `MODULE needs a newly authorized slice and checks: ${entry}` : `Unknown business module: ${entry}` });
    }
  }
  for (const entry of readdirSync(path.join(root, 'packages/server/src'), { withFileTypes: true })) {
    if (entry.isDirectory() && !['composition', 'infrastructure', 'modules'].includes(entry.name)) diagnostics.push({ rule: 'PROJECT_SCOPE', file: 'packages/server/src', detail: `New runtime registration needs an authorized slice: ${entry.name}` });
  }
  for (const problem of checkClientPackages(path.join(root, 'apps/mobile/package.json'))) diagnostics.push({ rule: 'CLIENT_BOUNDARY', file: 'apps/mobile/package.json', detail: problem });
  diagnostics.push(...checkTestFiles(root, [...sourceFiles(path.join(root, 'tests')), ...sourceFiles(path.join(root, 'apps/mobile/src'))].filter((file) => /\.(test|spec)\./.test(file))));
  if (files.length === 0) throw new Error('No application sources checked.');
  return { files: files.length, diagnostics };
}

export function checkTestFiles(root, files) {
  const diagnostics = [];
  for (const file of files) {
    const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (ts.isPropertyAccessExpression(node) && ['skip', 'todo', 'only', 'skipIf', 'runIf'].includes(node.name.text)) diagnostics.push({ rule: 'NO_SKIPPED_TESTS', file: normalize(path.relative(root, file)), detail: 'Required tests may not be disabled.' });
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return diagnostics;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkRepository(fileURLToPath(new URL('../', import.meta.url)));
    for (const diagnostic of result.diagnostics) console.error(`${diagnostic.rule} ${diagnostic.file}: ${diagnostic.detail}`);
    if (result.diagnostics.length) process.exitCode = 1;
    else console.log(`PASS: architecture graph, package closure and test gates (${result.files} sources).`);
  } catch (error) { console.error(`FAIL: architecture checker: ${error.message}`); process.exitCode = 1; }
}
