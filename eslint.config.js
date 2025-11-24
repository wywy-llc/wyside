import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // Global ignores must come first in ESLint 9.x Flat Config
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'template/**',
      'template-ui/**',
      'mcp-server/**',
      '**/*.mjs',
      '**/*.cjs',
      '*.config.js',
      'test-projects/**',
      '.tmp-*/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  }
);
