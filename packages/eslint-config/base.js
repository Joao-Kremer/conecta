import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = [
  {
    ignores: [
      'dist/**',
      'build/**',
      '.next/**',
      '.turbo/**',
      'node_modules/**',
      'coverage/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            { pattern: '@conecta/**', group: 'internal', position: 'after' },
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/no-default-export': 'warn',
    },
  },
  {
    // Config files conventionally export default
    files: [
      '**/*.config.{js,mjs,ts}',
      '**/eslint.config.{js,mjs}',
      '**/jest.config.{js,ts}',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
];

export default baseConfig;
