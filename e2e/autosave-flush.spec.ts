import { test, expect, type Page } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * Autosave must not lose the last thing you logged.
 *
 * The debounce is trailing and 2s long, and the effect that owns it cancels
 * the pending timer on cleanup. That is correct while the timer is merely
 * being restarted by the next keystroke, and wrong when the screen is going
 * away — so every exit path dropped the write.
 *
 * Measured before the fix: 700ms after an edit the value was gone, 2500ms
 * after it was saved. Every test here edits and leaves well inside that
 * window, which is exactly what "log the set, pocket the phone" looks like.
 */

const WINDOW_MS = 600; // comfortably inside the 2s debounce

async function openWorkoutAndEdit(page: Page, value: string) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  // Let the initial save settle so we are measuring the edit, not the create.
  await page.waitForTimeout(2600);

  await setNumericValue(page.getByLabel('Weight').first(), value);
  await page.waitForTimeout(WINDOW_MS);
}

function persisted(page: Page, value: string) {
  return page.evaluate(
    v => (localStorage.getItem('ironpath_workouts') ?? '').includes(`"weight":${v}`),
    value,
  );
}

test('the in-app back arrow does not discard the last edit', async ({ page }) => {
  await openWorkoutAndEdit(page, '185');
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(await persisted(page, '185'), 'edit lost on in-app back').toBe(true);
});

test('browser back does not discard the last edit', async ({ page }) => {
  await openWorkoutAndEdit(page, '186');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  expect(await persisted(page, '186'), 'edit lost on browser back').toBe(true);
});

test('backgrounding the app does not discard the last edit', async ({ page }) => {
  // A phone being locked or the app being switched away from — on a phone in
  // a gym this is the most common way the workout screen stops being watched.
  await openWorkoutAndEdit(page, '187');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);

  expect(await persisted(page, '187'), 'edit lost when backgrounded').toBe(true);
});

test('a completed set survives leaving immediately', async ({ page }) => {
  // Ticking a set is a change like any other, and the tick is the last thing
  // you do before putting the phone down.
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await page.waitForTimeout(2600);

  const before = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  await page.locator('button[aria-label^="Mark set"]').first().click();
  await page.waitForTimeout(WINDOW_MS);
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);

  const after = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  expect(after, 'completed set lost on leaving').not.toBe(before);
});

test('leaving without changing anything writes nothing and says nothing', async ({ page }) => {
  // The flush must be a no-op when there is nothing to save, or it would
  // rewrite storage and raise a toast every time you back out of a workout.
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await page.waitForTimeout(2600);

  const before = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  expect(after).toBe(before);
  await expect(page.getByText('Auto-saved')).toHaveCount(0);
});
