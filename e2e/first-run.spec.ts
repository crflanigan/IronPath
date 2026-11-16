import { test, expect, type Page } from '@playwright/test';

/**
 * What a newcomer runs into in their first ten minutes.
 *
 * Each of these was a place the app assumed its author: a schedule with no
 * rest days, a workout you had to start to see inside, and a Complete button
 * that refused unless every single box was ticked.
 */

async function asNewVisitor(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

/** Every weekday name except today's, so today is always a rest day. */
function allDaysButToday(): string[] {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names.filter((_, i) => i !== new Date().getDay());
}

test('the tour asks which days you train, and the calendar honours the answer', async ({ page }) => {
  await asNewVisitor(page);
  const tour = page.getByTestId('app-tour');
  await tour.getByRole('button', { name: 'Next' }).click();
  await expect(tour.getByRole('heading', { name: 'Which days do you train?' })).toBeVisible();
  await expect(tour.getByTestId('training-days-summary')).toHaveText('Every day');

  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date().getDay()
  ];
  await tour.getByRole('button', { name: today, exact: true }).click();
  await expect(tour.getByTestId('training-days-summary')).toHaveText('6 days a week');

  // Skipping from here must keep the answer: it was saved on the tap.
  await tour.getByRole('button', { name: 'Skip' }).click();
  await expect(tour).toHaveCount(0);

  await expect(page.getByTestId('selected-workout-type')).toContainText('Rest day');
  await expect(page.getByTestId('rest-day-next')).toContainText('Next up:');
  await expect(page.getByRole('button', { name: 'Train anyway' })).toBeVisible();
  await expect(page.locator('[data-rest]').first()).toBeVisible();
});

test('the last training day cannot be switched off', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Training days:/ }).click();
  const dialog = page.getByRole('dialog');
  for (const day of allDaysButToday()) {
    await dialog.getByRole('button', { name: day, exact: true }).click();
  }
  await expect(dialog.getByTestId('training-days-summary')).toHaveText('1 day a week');

  const last = dialog.getByRole('button', { pressed: true });
  await last.click();
  await expect(last).toHaveAttribute('aria-pressed', 'true');
});

test('training on a rest day starts the next workout in the rotation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Training days:/ }).click();
  const dialog = page.getByRole('dialog');
  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date().getDay()
  ];
  await dialog.getByRole('button', { name: today, exact: true }).click();
  await dialog.getByRole('button', { name: 'Save' }).click();

  const next = (await page.getByTestId('rest-day-next').textContent())?.replace('Next up:', '').trim();
  expect(next).toBeTruthy();

  await page.getByRole('button', { name: 'Train anyway' }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await expect(page.getByRole('heading', { level: 1, name: next! })).toBeVisible();
});

test('a workout can be looked inside before it is started', async ({ page }) => {
  await page.goto('/');
  const contents = page.getByTestId('workout-contents');
  await expect(contents).toContainText(/\d+ exercises · \d+ core · cardio/);

  await contents.getByText("What's in it").click();
  await expect(contents.getByRole('listitem').first()).toBeVisible();

  // Looking is not starting: nothing has been created.
  const stored = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  expect(JSON.parse(stored ?? '[]')).toHaveLength(0);
});

test('a workout can be finished without ticking everything', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  // The explanation of whose numbers these are, on a first workout only.
  await expect(page.getByTestId('first-workout-tip')).toContainText('starting point');

  const complete = page.getByRole('button', { name: 'Complete Workout' });

  // With nothing done there is nothing to finish.
  await complete.click();
  await expect(page.getByText('Nothing logged yet', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Mark set 1 complete' }).first().click();
  await complete.click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(/\d+ of \d+ items are not fully ticked off/);
  await dialog.getByRole('button', { name: 'Finish workout' }).click();

  await expect(page.getByTestId('workout-finish')).toBeVisible();
  const completed = await page.evaluate(
    () => JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]')[0].completed,
  );
  expect(completed).toBe(true);
});

test('the first-workout tip goes away when dismissed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  const tip = page.getByTestId('first-workout-tip');
  await tip.getByRole('button', { name: 'Got it' }).click();
  await expect(tip).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Complete Workout' })).toBeVisible();
  await expect(tip).toHaveCount(0);
});
