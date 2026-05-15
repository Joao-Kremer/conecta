import { baseConfig } from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    rules: {
      // NestJS modules and controllers commonly use default exports
      'import/no-default-export': 'off',
      // NestJS DI relies on emitDecoratorMetadata for constructor parameters,
      // so classes used as injection tokens must NOT be `import type`-only.
      // The consistent-type-imports rule cannot tell the difference.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
