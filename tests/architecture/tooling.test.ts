import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { ruleIds } from '../../scripts/check-architecture.mjs';
import mapping from '../../architecture-constraints.json' with { type: 'json' };

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

test('tools and every direct dependency are pinned; all workspace packages are private', () => {
  const manifests = ['package.json', ...['apps', 'packages'].flatMap((directory) => readdirSync(path.join(root, directory)).map((name) => `${directory}/${name}/package.json`))];
  expect(manifests).toHaveLength(7);
  for (const file of manifests) {
    const manifest = JSON.parse(read(file));
    expect(manifest.private).toBe(true);
    for (const version of Object.values({ ...manifest.dependencies, ...manifest.devDependencies })) expect(version).toMatch(/^(?:\d+\.\d+\.\d+|workspace:\*)$/);
  }
  const manifest = JSON.parse(read('package.json'));
  expect(manifest.packageManager).toBe('pnpm@10.33.4');
  expect(process.version).toBe(`v${read('.node-version').trim()}`);
  expect(read('pnpm-lock.yaml')).toContain("lockfileVersion: '9.0'");
  expect(read('pnpm-workspace.yaml')).toContain('onlyBuiltDependencies:');
  expect(read('.npmrc')).toContain('strict-peer-dependencies=true');
});

test('architecture mapping is current, traceable and honest about pending semantics', () => {
  const ids = new Set<string>();
  const manifest = JSON.parse(read('package.json'));
  for (const [file, digest] of Object.entries(mapping.sourceDigests)) expect(createHash('sha256').update(read(file)).digest('hex'), `${file} changed; review every affected constraint`).toBe(digest);
  for (const constraint of mapping.constraints) {
    expect(ids.has(constraint.id)).toBe(false);
    ids.add(constraint.id);
    expect(constraint.description.length).toBeGreaterThan(10);
    expect(constraint.sources.length).toBeGreaterThan(0);
    for (const source of constraint.sources) {
      const [file, section] = source.split(':');
      expect(file && section).toBeTruthy();
      if (!file || !section) throw new Error('Invalid constraint source.');
      const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(read(file)).toMatch(new RegExp(`^#{1,3} ${escaped}(?:\\s|\\.|$)`, 'm'));
    }
    for (const command of constraint.commands) {
      if (command.startsWith('pnpm run ')) expect(manifest.scripts[command.slice(9)]).toBeTruthy();
      else expect(command).toBe('./init.sh --app');
    }
    if (constraint.status === 'enforced') {
      expect(constraint.checks?.length).toBeGreaterThan(0);
      for (const file of constraint.checks ?? []) expect(existsSync(path.join(root, file)), file).toBe(true);
      for (const rule of constraint.rules ?? []) expect(ruleIds).toContain(rule);
    } else {
      expect(constraint.status).toBe('pending');
      expect(constraint.activateWhen?.length).toBeGreaterThan(10);
      expect(constraint.plannedTests?.length).toBeGreaterThan(0);
    }
  }
  expect(mapping.constraints.filter((constraint) => constraint.status === 'pending').length).toBeGreaterThan(0);
});
