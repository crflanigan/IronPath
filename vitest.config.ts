import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const DIRNAME = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(DIRNAME, 'client', 'src'),
      '@shared': path.resolve(DIRNAME, 'shared'),
      '@assets': path.resolve(DIRNAME, 'attached_assets'),
    },
  },
  root: path.resolve(DIRNAME, 'client'),
});
