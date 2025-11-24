#!/usr/bin/env node

import { PackageJson } from 'type-fest';

export const config: {
  dependencies: string[];
  scripts: PackageJson.Scripts;
  filesCopy: Record<string, string>;
  filesMerge: Record<string, string>;
} = {
  dependencies: [
    '@babel/core',
    '@babel/preset-env',
    '@eslint/js',
    '@hono/node-server',
    '@google/clasp',
    '@rollup/plugin-babel',
    '@rollup/plugin-commonjs',
    '@rollup/plugin-node-resolve',
    '@rollup/plugin-replace',
    '@types/google-apps-script',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    '@vitest/coverage-v8',
    '@vitest/ui',
    'dotenv',
    'eslint',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'factory.ts',
    'google-auth-library',
    'googleapis',
    'gts',
    'hono',
    'ncp',
    'prettier',
    'rimraf',
    'rollup',
    'rollup-plugin-cleanup',
    'rollup-plugin-prettier',
    'rollup-plugin-typescript2',
    'ts-node',
    'typescript',
    'typescript-eslint',
    'vite',
    'vitest',
  ],
  scripts: {
    'clean': 'rimraf build dist',
    'lint': 'eslint --fix --no-error-on-unmatched-pattern src/ test/',
    'format': 'prettier --write --log-level silent .',
    'bundle': 'rollup --no-treeshake -c rollup.config.mjs',
    'build':
      'npm run clean && npm run bundle && ncp appsscript.json dist/appsscript.json',
    'test': 'npm run lint && npx tsc --noEmit && vitest run',
    'deploy':
      'npm run build && ncp .clasp-dev.json .clasp.json && clasp push -f',
    'deploy:stg':
      'npm run test && npm run build && ncp .clasp-stg.json .clasp.json && clasp push',
    'deploy:prod':
      'npm run test && npm run build && ncp .clasp-prod.json .clasp.json && clasp push',
  },
  filesCopy: {
    '.editorconfig': '.editorconfig',
    '.eslintrc.json': '.eslintrc.json',
    '.prettierrc.json': '.prettierrc.json',
    'jest.config.json': 'jest.config.json',
  },
  filesMerge: {
    'dist/.gitignore-target': '.gitignore',
    '.claspignore': '.claspignore',
    '.eslintignore': '.eslintignore',
    '.prettierignore': '.prettierignore',
  },
};

export const configForAngular: {
  dependencies: string[];
  scripts: PackageJson.Scripts;
  filesCopy: Record<string, string>;
  filesMerge: Record<string, string>;
} = {
  dependencies: [
    '@angular/cli',
    '@google/clasp',
    '@types/google-apps-script',
    '@types/jest',
    '@typescript-eslint/eslint-plugin@^5.55.0',
    'eslint@^8.36.0',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'fs-extra',
    'gts',
    'inquirer@^8.0.0',
    'jest',
    'ncp',
    'prettier',
    'rimraf',
    'rollup',
    'rollup-plugin-cleanup',
    'rollup-plugin-prettier',
    'rollup-plugin-typescript2',
    'ts-jest',
    'typescript',
  ],
  scripts: {
    'preinstall':
      'test -d src/ui || (cd src/ && ng new --skip-git --skip-tests=true --routing=false --ssr=false --standalone ui && cd ui/ && ng add --skip-confirmation @angular/material)',
    'clean': 'rimraf build dist',
    'lint': 'eslint --fix --no-error-on-unmatched-pattern src/ test/',
    'bundle': 'rollup --no-treeshake -c rollup.config.mjs',
    'build': 'npm run clean && npm run bundle',
    'build-ui': 'npm run build --prefix src/ui',
    'test': 'jest test/ --passWithNoTests --detectOpenHandles',
    'test-ui': 'npm run test --prefix src/ui',
    'deploy':
      'npm run lint && npm run test && npm run build && ncp appsscript.json dist/appsscript.json && ncp .clasp-dev.json .clasp.json && npm run build-ui && npm run deploy-ui && clasp push -f',
    'deploy-ui': 'node deploy-ui.mjs',
    'deploy:prod':
      'npm run lint && npm run test && npm run build && ncp appsscript.json dist/appsscript.json && ncp .clasp-prod.json .clasp.json && npm run build-ui && npm run deploy-ui && clasp push',
    'serve-ui': 'cd src/ui && ng serve',
    'fix-animations': 'node fix-animations.mjs',
    'postinstall': 'npm run fix-animations && cd src/ui && npm install',
  },
  filesCopy: {
    '.editorconfig': '.editorconfig',
    '.eslintrc.json': '.eslintrc.json',
    '.prettierrc.json': '.prettierrc.json',
    'jest.config.json': 'jest.config.json',
    'rollup.config.mjs': 'rollup.config.mjs',
    'deploy-ui.mjs': 'deploy-ui.mjs',
    'fix-animations.mjs': 'fix-animations.mjs',
    'tsconfig.json': 'tsconfig.json',
  },
  filesMerge: {
    'dist/.gitignore-target': '.gitignore',
    '.claspignore': '.claspignore',
    '.eslintignore': '.eslintignore',
    '.prettierignore': '.prettierignore',
  },
};

export const configForSvelte: {
  dependencies: string[];
  scripts: PackageJson.Scripts;
  filesCopy: Record<string, string>;
  filesMerge: Record<string, string>;
} = {
  dependencies: [
    ...config.dependencies,
    'fs-extra@^11.1.0',
    '@sveltejs/vite-plugin-svelte@^6.2.1',
    'svelte@^5.43.14',
    'svelte-check@^4.3.4',
    'tslib@^2.8.1',
    'tailwindcss@^4.1.17',
    'postcss@^8.5.6',
    'autoprefixer@^10.4.22',
  ],
  scripts: {
    ...config.scripts,
    'preinstall': 'node setup-svelte.mjs',
    'build-ui': 'npm run build --prefix src/ui',
    'deploy-ui': 'node deploy-ui.mjs src/ui/dist',
    'deploy':
      'npm run license && npm run build && ncp appsscript.json dist/appsscript.json && ncp .clasp-dev.json .clasp.json && npm run build-ui && npm run deploy-ui && clasp push -f',
    'deploy:prod':
      'npm run test && npm run build && ncp appsscript.json dist/appsscript.json && ncp .clasp-prod.json .clasp.json && npm run build-ui && npm run deploy-ui && clasp push',
    'serve-ui': 'cd src/ui && npm run dev',
    'postinstall': 'cd src/ui && npm install',
  },
  filesCopy: {
    ...config.filesCopy,
    'deploy-ui.mjs': 'deploy-ui.mjs',
    'setup-svelte.mjs': 'setup-svelte.mjs',
  },
  filesMerge: config.filesMerge,
};

export const configForUi = configForAngular;
