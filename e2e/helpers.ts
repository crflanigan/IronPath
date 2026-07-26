import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Count document loads on a page.
 *
 * Has to be observed from outside: each reload gets a fresh document with its
 * own `performance` timeline, so nothing measured *inside* the page can tell
 * one load from two.
 */
export function trackPageLoads(page: Page): { count: number } {
  const counter = { count: 0 };
  page.on('load', () => {
    counter.count += 1;
  });
  return counter;
}

/** Resolves once the service worker is installed, activated and in control. */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, {
    timeout: 20_000,
  });
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
