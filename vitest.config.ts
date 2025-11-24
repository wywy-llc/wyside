import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'template/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'test/**/*.test.ts',
      'template/**/*.test.ts',
      'template-ui/**/*.test.ts',
    ],
  },
});
