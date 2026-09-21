import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'apps/api/src/generated/**',
      'packages/mock-data/src/index.ts', // large vendored fixture
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Loosen a few rules repo-wide: this code started as a Figma export and is
  // being migrated, not greenfield. Tighten over time.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // Frontend apps — browser + React
  {
    files: ['apps/client/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Backend + node-side packages + config files
  {
    files: [
      'apps/api/**/*.ts',
      'packages/**/*.ts',
      '*.{js,ts,mjs}',
      '**/vite.config.ts',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
