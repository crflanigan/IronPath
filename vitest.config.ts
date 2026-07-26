import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const DIRNAME = typeof import.meta.dirname !== 'undefined'
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

// Mirrors the define in vite.config.ts. Without it, anything rendering the
// version would throw under test with `__APP_VERSION__ is not defined`.
const { version } = JSON.parse(
  readFileSync(path.resolve(DIRNAME, 'package.json'), 'utf-8'),
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
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
    },
  },
  root: path.resolve(DIRNAME, 'client'),
});
