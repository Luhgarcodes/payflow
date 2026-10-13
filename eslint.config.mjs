import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'coverage/', 'backups/', 'node_modules/', 'playground/'] },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read env via src/config only.' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Express route params must be type aliases; interfaces lack the implicit index signature.
      '@typescript-eslint/consistent-type-definitions': 'off',
      // `||` is intentional for env strings: an empty value falls back to the default.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true } },
      ],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/config/**/*.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  prettier,
);
