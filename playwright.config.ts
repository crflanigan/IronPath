import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests run against a real production build served by `vite preview`,
 * not the dev server. IronPath is a PWA whose behaviour depends on the built
 * output — hashed assets, the service worker, and the SPA fallback — none of
 * which the dev server represents faithfully.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The app is built mobile-first and is used on a phone in a gym.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
