#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const applicationChecks = [
  'lint', 'typecheck', 'test:unit', 'test:integration',
  'test:contracts', 'test:architecture', 'build', 'test:e2e',
];
const statuses = new Set(['not-started', 'in-progress', 'blocked', 'done']);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };

// Structural consistency only: this cannot prove that an evidence claim is true.
export function validateTracker(tracker, { hasApplication = false } = {}) {
  requireThat(tracker?.schemaVersion === 1, 'Unsupported feature schemaVersion.');
  requireThat(/^\d{4}-\d{2}-\d{2}$/.test(tracker.updatedAt ?? ''), 'updatedAt must be YYYY-MM-DD.');
  requireThat(Array.isArray(tracker.features) && tracker.features.length > 0, 'features must be nonempty.');
  const byId = new Map();
  for (const feature of tracker.features) {
    requireThat(feature && /^feat-\d+$/.test(feature.id), 'Invalid feature ID.');
    requireThat(!byId.has(feature.id), `Duplicate feature: ${feature.id}`);
    byId.set(feature.id, feature);
    requireThat(nonempty(feature.name) && nonempty(feature.description), `${feature.id}: missing description.`);
    requireThat(['harness', 'application'].includes(feature.kind), `${feature.id}: invalid kind.`);
    requireThat(statuses.has(feature.status), `${feature.id}: invalid status.`);
    requireThat(Array.isArray(feature.dependencies) && feature.dependencies.every(nonempty), `${feature.id}: invalid dependencies.`);
    requireThat(new Set(feature.dependencies).size === feature.dependencies.length, `${feature.id}: duplicate dependencies.`);
    requireThat(Array.isArray(feature.acceptanceCriteria) && feature.acceptanceCriteria.length > 0
      && feature.acceptanceCriteria.every(nonempty), `${feature.id}: missing acceptance criteria.`);
    requireThat(typeof feature.evidence === 'string', `${feature.id}: evidence must be a string.`);
    if (feature.status === 'done') {
      requireThat(nonempty(feature.evidence), `${feature.id}: done requires evidence.`);
      requireThat(feature.kind !== 'application' || hasApplication, `${feature.id}: application completion requires package.json.`);
    }
    if (feature.status === 'blocked') requireThat(nonempty(feature.blockedReason), `${feature.id}: blockedReason required.`);
  }
  for (const feature of byId.values()) {
    for (const dependency of feature.dependencies) {
      requireThat(byId.has(dependency), `${feature.id}: unknown dependency ${dependency}.`);
      if (['in-progress', 'done'].includes(feature.status)) {
        requireThat(byId.get(dependency).status === 'done', `${feature.id}: dependency ${dependency} is not done.`);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    requireThat(!visiting.has(id), `Dependency cycle at ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id).dependencies) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  const running = tracker.features.filter((feature) => feature.status === 'in-progress');
  requireThat(running.length <= 1, 'Only one feature may be in-progress.');
  if (tracker.activeFeatureId === null) {
    requireThat(running.length === 0, 'in-progress feature must be active.');
  } else {
    const active = byId.get(tracker.activeFeatureId);
    requireThat(active && ['in-progress', 'blocked'].includes(active.status), 'activeFeatureId must identify in-progress or blocked work.');
    requireThat(running.every((feature) => feature.id === active.id), 'Active feature mismatch.');
  }
  return { features: tracker.features.length, activeFeatureId: tracker.activeFeatureId };
}

export function validateApplicationContract(manifest) {
  requireThat(/^pnpm@\d+\.\d+\.\d+(?:\+[^\s]+)?$/.test(manifest?.packageManager ?? ''), 'Pin packageManager to pnpm@x.y.z.');
  for (const check of applicationChecks) {
    requireThat(nonempty(manifest.scripts?.[check]), `Missing application script: ${check}`);
    requireThat(!/\binit\.sh\b/.test(manifest.scripts[check]), `${check}: must not recursively invoke init.sh.`);
  }
  // Meaningful test content still requires review; script existence is not a pass.
}

export function verifyHarness(root, { appContract = false } = {}) {
  const required = ['AGENTS.md', 'feature_list.json', 'progress.md', 'session-handoff.md',
    'init.sh', 'scripts/verify-harness.mjs', 'scripts/verify-harness.test.mjs',
    'ARCHITECTURE.md', 'MODULES.md', '2026-09-12-hairmate-product-v1.0.0-design.md'];
  for (const relative of required) requireThat(existsSync(path.join(root, relative)), `Missing file: ${relative}`);
  for (const relative of required.slice(0, 4)) {
    const content = readFileSync(path.join(root, relative), 'utf8');
    requireThat(content.trim().length > 0, `Empty file: ${relative}`);
    requireThat(!/\{\{[A-Z_]+\}\}|\[feat-XXX|YYYY-MM-DD HH:MM|Replace this placeholder/.test(content), `Unresolved template: ${relative}`);
    requireThat(!/[\t ]+$/m.test(content), `Trailing whitespace: ${relative}`);
    for (const match of content.matchAll(/\]\((\.\/[^)#]+)(?:#[^)]*)?\)/g)) {
      const target = path.resolve(root, match[1]);
      requireThat(target.startsWith(`${path.resolve(root)}${path.sep}`) && existsSync(target), `Invalid local link in ${relative}: ${match[1]}`);
    }
  }
  const hasApplication = existsSync(path.join(root, 'package.json'));
  const state = validateTracker(JSON.parse(readFileSync(path.join(root, 'feature_list.json'), 'utf8')), { hasApplication });
  if (appContract) {
    requireThat(hasApplication, 'Application verification requires package.json.');
    validateApplicationContract(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')));
    for (const relative of ['pnpm-lock.yaml', 'pnpm-workspace.yaml', '.node-version']) {
      requireThat(existsSync(path.join(root, relative)), `Missing application file: ${relative}`);
    }
  }
  return state;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    const args = process.argv.slice(2);
    requireThat(args.length === 0 || (args.length === 1 && args[0] === '--app-contract'), 'Usage: node scripts/verify-harness.mjs [--app-contract]');
    const root = fileURLToPath(new URL('../', import.meta.url));
    const state = verifyHarness(root, { appContract: args[0] === '--app-contract' });
    console.log(`PASS: harness structure; ${state.features} features; active=${state.activeFeatureId ?? 'none'}.`);
    if (args[0]) console.log('Application script contracts present; no application checks executed by this validator.');
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
