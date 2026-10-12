import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
