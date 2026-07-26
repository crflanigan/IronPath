import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// These specs are ESM, so there is no __dirname.
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * The version shown in Settings, checked against a real production build.
 *
 * The unit test in `client/src/lib/version.test.ts` runs under vitest, so it
 * only ever proves vitest.config.ts's `define` is right. The define that
 * actually ships lives in vite.config.ts, and nothing else exercises it — a
 * wrong version there would reach users with every other check green.
 *
 * Playwright runs against `vite preview` of the real build, so this is the one
 * place that boundary gets tested.
 */

const { version } = JSON.parse(
  readFileSync(path.resolve(HERE, '..', 'package.json'), 'utf-8'),
) as { version: string };

test('Settings shows the version from package.json', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect(page.getByText(`IronPath v${version}`)).toBeVisible();
});

test('the built bundle carries no unsubstituted placeholder', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  // A missing define in vite.config.ts leaves the identifier in place, which
  // would throw at render — but a define set to an empty string would quietly
  // render "IronPath v". Neither should ever be visible.
  await expect(page.getByText('__APP_VERSION__')).toHaveCount(0);
  await expect(page.getByText(/IronPath v\d+\.\d+\.\d+/)).toBeVisible();
});
