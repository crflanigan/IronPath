import { test, expect } from '@playwright/test';
import { trackPageLoads, waitForServiceWorker } from './helpers';

/**
 * Service worker behaviour, in a real browser. The unit tests pin the caching
 * strategy; these cover the things only a browser can show — that the page is
 * not reloaded out from under the user, that the app genuinely works with the
 * network switched off, and that navigations still reach the network so a
 * deploy can land.
 */

test('a first visit loads the page exactly once', async ({ page }) => {
  const loads = trackPageLoads(page);

  await page.goto('/');
  await waitForServiceWorker(page);
  // The old registration script reloaded on `controllerchange`, roughly 100ms
  // after the initial load. Wait well past that window before asserting.
  await page.waitForTimeout(2000);

  expect(loads.count).toBe(1);
});

test('the app still opens with the network switched off', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'IronPath' })).toBeVisible();
  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();

  await context.setOffline(false);
});

test('a workout can be logged with the network switched off', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();

  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  const firstWeight = page.getByLabel('Weight').first();
  await firstWeight.fill('');
  await firstWeight.fill('155');
  await page.getByRole('button', { name: 'Save Workout' }).click();

  await page.reload();
  await expect(page.getByLabel('Weight').first()).toHaveValue('155');

  await context.setOffline(false);
});

test('exercise reference photos are available offline', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);

  await context.setOffline(true);

  // These are precached at install precisely so they survive this.
  const results = await page.evaluate(async () => {
    const urls = [
      '/exercise-images/seated-row.jpg',
      '/exercise-images/pec-fly.jpg',
      '/exercise-images/placeholder.svg',
    ];
    return Promise.all(
      urls.map(async url => {
        try {
          const response = await fetch(url);
          return { url, ok: response.ok };
        } catch {
          return { url, ok: false };
        }
      }),
    );
  });

  expect(results.every(r => r.ok)).toBe(true);
  await context.setOffline(false);
});

test('a new deploy reaches an already-installed app', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorker(page);
  await expect(page).toHaveTitle(/IronPath/);

  // Stand in for a deploy: serve a changed document on the next navigation.
  // A cache-first worker answers from its own copy and never sees this, which
  // is exactly why updates could not reach an installed PWA. Counting network
  // requests does not distinguish the two — the browser reports a document
  // request either way — so assert on the content actually rendered.
  await context.route('**/', async route => {
    const response = await route.fetch();
    // Matched by pattern, not by the literal title. Pinning the exact text
    // meant this substitution silently no-op'd the moment the title changed
    // for SEO, and the test only survived that because the assertion below is
    // an exact match rather than /IronPath/.
    const body = (await response.text()).replace(
      /<title>[\s\S]*?<\/title>/,
      '<title>IronPath vNext</title>',
    );
    await route.fulfill({ response, body });
  });

  await page.reload();

  await expect(page).toHaveTitle('IronPath vNext');
  await expect(page.getByRole('heading', { name: 'IronPath' })).toBeVisible();
});
