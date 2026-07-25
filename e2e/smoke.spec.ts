import { test, expect } from '@playwright/test';
import { gotoSettled, setNumericValue } from './helpers';

/**
 * Baseline smoke coverage: the paths that must never break, exercised against a
 * real production build in a real browser. Each browser context starts with an
 * empty localStorage, so tests do not share state.
 */

test('the app shell loads and renders the calendar', async ({ page }) => {
  await gotoSettled(page);

  await expect(page.getByRole('heading', { name: 'IronPath' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'History' })).toBeVisible();

  // The stats row renders three counters as buttons. Scoped by role because
  // "Completed" also appears as static text in the workout-status legend.
  await expect(page.getByRole('button', { name: /Completed/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Day Streak/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Top Streak/ })).toBeVisible();
});

test("starting today's workout opens a workout with prefilled sets", async ({ page }) => {
  await gotoSettled(page);
  await page.getByRole('button', { name: "Start Today's Workout" }).click();

  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await expect(page.getByText('Main Workout')).toBeVisible();

  // Built-in templates seed weight/reps, so the first set is non-empty.
  const firstWeight = page.getByLabel('Weight').first();
  await expect(firstWeight).toBeVisible();
  await expect(firstWeight).not.toHaveValue('');
});

test('logged weight survives a full page reload', async ({ page }) => {
  await gotoSettled(page);
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  const firstWeight = page.getByLabel('Weight').first();
  await setNumericValue(firstWeight, '137');
  await page.getByRole('button', { name: 'Save Workout' }).click();

  // The save path is async, so wait for the value to actually reach storage
  // before reloading. This also separates "did it persist" from "did it
  // rehydrate" — a failure here points at storage, a failure after the reload
  // points at rehydration.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
        return stored.some((w: { exercises?: { sets?: { weight?: number }[] }[] }) =>
          w.exercises?.some(e => e.sets?.some(s => s.weight === 137)),
        );
      }),
    )
    .toBe(true);

  await page.reload();

  // Deep-linking back into the workout must rehydrate it from localStorage.
  await expect(page.getByLabel('Weight').first()).toHaveValue('137');
});

test('a started workout appears on the calendar after navigating back', async ({ page }) => {
  await gotoSettled(page);
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  await page.getByRole('button', { name: 'Calendar' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Today's cell carries the pending marker rather than the plain today marker.
  await expect(page.getByText('🕒').first()).toBeVisible();
});

test('the workout page is reachable by deep link after a cold start', async ({ page }) => {
  await gotoSettled(page);
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  const workoutUrl = page.url();

  // Fresh navigation to the deep link exercises the SPA fallback plus
  // rehydration from storage, which is what a reload in the gym does.
  await page.goto(workoutUrl);
  await expect(page.getByText('Main Workout')).toBeVisible();
  await expect(page.getByLabel('Weight').first()).toBeVisible();
});
