import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationChecks, validateApplicationContract, validateTracker } from './verify-harness.mjs';

const feature = (id = 'feat-001') => ({
  id, name: 'Harness fixture', description: 'Non-product, in-memory test fixture.',
  kind: 'harness', dependencies: [], status: 'not-started',
  acceptanceCriteria: ['Structural checks pass.'], evidence: '',
});
const tracker = () => ({ schemaVersion: 1, updatedAt: '2026-09-13', activeFeatureId: null, features: [feature()] });

test('accepts pending, active, and evidenced completed work', () => {
  const state = tracker();
  assert.equal(validateTracker(state).features, 1);
  state.features[0].status = 'in-progress';
  state.activeFeatureId = 'feat-001';
  assert.equal(validateTracker(state).activeFeatureId, 'feat-001');
  state.features[0].status = 'done';
  state.features[0].evidence = 'Fixture assertion, not product evidence.';
  state.activeFeatureId = null;
  assert.equal(validateTracker(state).activeFeatureId, null);
});

test('rejects duplicate IDs and unknown dependencies', () => {
  const state = tracker();
  state.features.push(feature());
  assert.throws(() => validateTracker(state), /Duplicate feature/);
  state.features.pop();
  state.features[0].dependencies = ['feat-999'];
  assert.throws(() => validateTracker(state), /unknown dependency/);
});

test('rejects self and multi-feature dependency cycles', () => {
  const state = tracker();
  state.features[0].dependencies = ['feat-001'];
  assert.throws(() => validateTracker(state), /cycle/);
  state.features.push({ ...feature('feat-002'), dependencies: ['feat-001'] });
  state.features[0].dependencies = ['feat-002'];
  assert.throws(() => validateTracker(state), /cycle/);
});

test('rejects multiple active features and mismatched active pointer', () => {
  const state = tracker();
  state.features[0].status = 'in-progress';
  assert.throws(() => validateTracker(state), /must be active/);
  state.activeFeatureId = 'feat-001';
  state.features.push({ ...feature('feat-002'), status: 'in-progress' });
  assert.throws(() => validateTracker(state), /Only one/);
});

test('requires completed dependencies, evidence, and blocker reasons', () => {
  const state = tracker();
  state.features.push({ ...feature('feat-002'), dependencies: ['feat-001'], status: 'in-progress' });
  state.activeFeatureId = 'feat-002';
  assert.throws(() => validateTracker(state), /is not done/);
  state.features[0].status = 'done';
  assert.throws(() => validateTracker(state), /requires evidence/);
  state.features[0].status = 'blocked';
  assert.throws(() => validateTracker(state), /blockedReason/);
});

test('cannot mark application done in a documents-only repository', () => {
  const state = tracker();
  Object.assign(state.features[0], { kind: 'application', status: 'done', evidence: 'Not enough without an application.' });
  assert.throws(() => validateTracker(state), /requires package.json/);
});

test('rejects invalid schema, status, and missing acceptance criteria', () => {
  for (const mutate of [
    (state) => { state.schemaVersion = 2; },
    (state) => { state.features[0].status = 'probably-done'; },
    (state) => { state.features[0].acceptanceCriteria = []; },
  ]) {
    const state = tracker(); mutate(state);
    assert.throws(() => validateTracker(state));
  }
});

test('application contract requires pinned pnpm, seven base checks and e2e', () => {
  const manifest = { packageManager: 'pnpm@0.0.0', scripts: Object.fromEntries(applicationChecks.map((key) => [key, `node checks/${key}.mjs`])) };
  assert.doesNotThrow(() => validateApplicationContract(manifest));
  delete manifest.scripts['test:integration'];
  assert.throws(() => validateApplicationContract(manifest), /Missing application script/);
  manifest.scripts['test:integration'] = './init.sh';
  assert.throws(() => validateApplicationContract(manifest), /recursively/);
  manifest.packageManager = 'pnpm@latest';
  assert.throws(() => validateApplicationContract(manifest), /Pin packageManager/);
  manifest.packageManager = 'pnpm@0.0.0';
  manifest.scripts['test:integration'] = 'node checks/integration.mjs';
  delete manifest.scripts['test:e2e'];
  assert.throws(() => validateApplicationContract(manifest), /Missing application script: test:e2e/);
});
