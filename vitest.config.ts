import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    allowOnly: false,
    passWithNoTests: false,
    bail: 1,
    maxWorkers: 2,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    projects: ['unit', 'integration', 'contracts', 'architecture'].map((name) => ({
      extends: true,
      test: { name, include: [`tests/${name}/**/*.test.ts`] },
    })),
  },
});
