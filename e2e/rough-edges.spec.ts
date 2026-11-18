import { test, expect, type Page } from '@playwright/test';

/**
 * Small things that were wrong on screens people see every day.
 */

const tick = (page: Page) => page.getByRole('button', { name: /^Mark set \d+ complete$/ }).first();

async function startToday(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
}

test('a day with a workout on it offers that workout, not a second start', async ({ page }) => {
  await startToday(page);
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Nothing ticked yet: it is there to be started, once.
  await expect(page.getByRole('button', { name: 'Start Workout' })).toBeVisible();
  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toHaveCount(0);
  await expect(page.getByTestId('workout-contents')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start Workout' }).click();
  await tick(page).click();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Continue Workout' })).toBeVisible();

  // Finished: one way in, and no disabled button repeating the badge.
  await page.getByRole('button', { name: 'Continue Workout' }).click();
  await page.getByRole('button', { name: 'Complete Workout' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Finish workout' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'View Details' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Start|Continue)/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toHaveCount(0);
});

test('the progress bar moves on the first set, not the third', async ({ page }) => {
  await startToday(page);
  const bar = page.getByTestId('progress-bar');
  await expect(bar).toHaveAttribute('style', /width: 0%/);
  await tick(page).click();
  await expect(bar).not.toHaveAttribute('style', /width: 0%/);
});

test('the calendar returns to today when the app is reopened on a later day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-10T18:00:00') });
  await page.goto('/');
  await page.getByRole('button', { name: '5', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Start This Workout' })).toBeVisible();

  // Same day: the place is kept, as before.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Start This Workout' })).toBeVisible();

  // The phone kept the app suspended overnight and brought it back.
  await page.clock.setSystemTime(new Date('2026-03-11T07:00:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();
  await expect(page.locator('[data-today]')).toHaveText(/11/);

  // And a reload the next day does not restore yesterday's browsing either.
  await page.getByRole('button', { name: '5', exact: true }).first().click();
  await page.clock.setSystemTime(new Date('2026-03-12T07:00:00'));
  await page.reload();
  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();
});

test('History does not print a unit with no number, or "1 workouts"', async ({ page }) => {
  await page.goto('/');
  // A finished workout from before durations were measured.
  await page.evaluate(() => {
    const now = new Date().toISOString();
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('ironpath_workouts', JSON.stringify([{
      id: 1, date, type: 'Legs', completed: true, duration: null, abs: [],
      exercises: [{ machine: 'Leg Press', region: 'Legs', feel: 'Medium', completed: true,
        sets: [{ weight: 100, reps: 10, rest: '1:00', completed: true }] }],
      createdAt: now, updatedAt: now,
    }]));
  });
  await page.goto('/history');
  await expect(page.getByTestId('recent-type')).toHaveText('Legs');
  await expect(page.getByText('1 workout', { exact: true })).toBeVisible();
  await expect(page.getByText('1 workouts')).toHaveCount(0);
  await expect(page.getByText(/^m$/)).toHaveCount(0);
  await expect(page.getByText('0m')).toHaveCount(0);
});
