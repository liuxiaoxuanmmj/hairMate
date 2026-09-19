import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', '.pnpm-store/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly',
        fetch: 'readonly', AbortController: 'readonly', AbortSignal: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
      },
    },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { module: 'readonly', require: 'readonly', __dirname: 'readonly' } } },
  { files: ['apps/mobile/**/*.test.tsx'], languageOptions: { globals: { jest: 'readonly', test: 'readonly', expect: 'readonly', afterEach: 'readonly' } } },
);
