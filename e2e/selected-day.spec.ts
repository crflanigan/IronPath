import { test, expect } from '@playwright/test';

/**
 * The start button lives inside a panel headed with the selected date, directly
 * under a line reading "Selected Day's Workout: Legs". It nonetheless always
 * acted on `new Date()` and today's scheduled type, so tapping a day and
 * pressing it created a workout for today — of a different type than the one
 * named a few pixels above.
 */

/** A day in the current month that is not today, avoiding month-edge cases. */
function otherDayThisMonth() {
  const now = new Date();
  const day = now.getDate() === 15 ? 16 : 15;
  const date = new Date(now.getFullYear(), now.getMonth(), day);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { day, iso };
}

test('starting from a selected day creates the workout for that day', async ({ page }) => {
  const { day, iso } = otherDayThisMonth();

  await page.goto('/');
  await page.waitForTimeout(800);

  // The default selection is today, so the familiar label is what shows first.
  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();

  await page.getByRole('button', { name: String(day), exact: true }).first().click();
  await page.waitForTimeout(500);

  // Once the selection is not today, the button stops claiming to be about today.
  const start = page.getByRole('button', { name: 'Start This Workout' });
  await expect(start).toBeVisible();

  const advertised = (await page.getByText(/Selected Day's Workout:/).textContent())
    ?.replace(/Selected Day's Workout:\s*/, '')
    .trim();
  expect(advertised, 'panel should name a workout type').toBeTruthy();

  await start.click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1500);

  const created = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('ironpath_workouts') || '[]');
    return stored.map((w: { date: string; type: string }) => ({ date: w.date, type: w.type }));
  });

  expect(created, 'exactly one workout should have been created').toHaveLength(1);
  // The whole bug: this used to be today's date and today's type.
  expect(created[0].date).toBe(iso);
  expect(created[0].type).toBe(advertised);
});

test('starting from today still works and still says so', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1200);

  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_workouts') || '[]').map((w: { date: string }) => w.date),
  );

  expect(stored).toEqual([today]);
});
