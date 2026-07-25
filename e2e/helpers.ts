import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Navigate and wait until the service worker has settled.
 *
 * On a first visit the app registers its service worker, which calls
 * `clients.claim()`. That fires `controllerchange`, and `index.html` responds by
 * calling `window.location.reload()` — so a first load silently becomes two.
 *
 * That reload discards anything typed before it lands, which makes every test
 * that interacts quickly flaky (and is a real defect for users, not just for
 * tests — see the service-worker fix). Reloading once deliberately puts the page
 * in a steady state where the controller is already installed, so
 * `controllerchange` cannot fire again for this context.
 *
 * Once the underlying bug is fixed, this can collapse back to `page.goto(path)`.
 */
export async function gotoSettled(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, {
    timeout: 15_000,
  });
  await page.reload();
  await page.waitForLoadState('load');
}

/** Number of times the document has loaded — 1 unless something reloaded it. */
export async function countPageLoads(page: Page): Promise<number> {
  return page.evaluate(
    () => performance.getEntriesByType('navigation').length,
  );
}

/**
 * Replace the contents of a numeric input, reliably.
 *
 * The app moves the caret to the end of these fields on focus, inside a
 * `requestAnimationFrame` (see `useCursorEndOnFocus`). If that frame fires
 * between Playwright's select-all and its insert, the selection collapses and
 * the new text is appended instead of replacing — e.g. filling "137" over a
 * seeded "75" yields "75137".
 *
 * That race is invisible to a human (nobody types within one frame of tapping a
 * field), so this is harness compensation, not a workaround for a user-facing
 * bug. Retrying the whole clear-then-fill sequence makes it deterministic.
 */
export async function setNumericValue(
  locator: Locator,
  value: string,
): Promise<void> {
  await expect(async () => {
    await locator.fill('');
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}
