import { test, expect, type Page } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * Four things found by using the app for a real session.
 */

const firstCard = (page: Page) => page.locator('[data-exercise-card]').first();

async function startToday(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
}

test('a set ticked by mistake can be unticked', async ({ page }) => {
  await startToday(page);
  const card = firstCard(page);

  await card.getByRole('button', { name: 'Mark set 1 complete' }).click();
  await expect(card.getByRole('button', { name: 'Mark set 1 complete' })).toHaveCount(0);

  await card.getByRole('button', { name: 'Mark set 1 incomplete' }).click();
  // Back to where it was: set 1 is the next one to tick again.
  await expect(card.getByRole('button', { name: 'Mark set 1 complete' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Mark set 1 incomplete' })).toHaveCount(0);

  // And that is what is stored, not only what is drawn.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
        return list[list.length - 1]?.exercises[0].sets.map((s: { completed: boolean }) => s.completed);
      }),
    )
    .toEqual([false, false, false]);
});

test('a finished exercise can be reopened by unticking one of its sets', async ({ page }) => {
  await startToday(page);
  const card = firstCard(page);
  const name = (await card.getByRole('heading').textContent())!.trim();

  for (let i = 0; i < 3; i++) await card.getByRole('button', { name: /^Mark set \d+ complete$/ }).click();
  // A finished exercise folds away once you come back to it; open it again
  // the way you would then.
  await page.reload();
  await card.getByRole('button', { name: `Show ${name}` }).click();
  await card.getByRole('button', { name: 'Mark set 2 incomplete' }).click();

  await expect(card.getByRole('button', { name: 'Mark set 2 complete' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Mark set 1 incomplete' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Mark set 3 incomplete' })).toBeVisible();
});

test('a custom workout can be looked inside from the calendar before it is started', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ironpath_template_tour_seen', '1');
    if (localStorage.getItem('ironpath_custom_templates')) return;
    const set = { weight: undefined, reps: undefined, rest: '', completed: false };
    const ex = (machine: string) => ({
      machine, region: 'Back', equipment: 'machine', feel: 'Medium', completed: false, sets: [set, set, set],
    });
    localStorage.setItem('ironpath_custom_templates', JSON.stringify([{
      id: 1,
      name: 'My Pull Day',
      exercises: [ex('Wide Grip Pulldown'), ex('Seated Row')],
      abs: [{ name: 'Crunch', reps: 30, completed: false }],
      includeInAutoSchedule: false,
    }]));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'My Pull Day', exact: true }).click();

  // Picking it gives the day its workout straight away, and the preview stays.
  await expect(page.getByTestId('selected-workout-type')).toContainText('My Pull Day');
  const contents = page.getByTestId('workout-contents');
  await expect(contents).toContainText('2 exercises · 1 core · cardio');
  await contents.getByText("What's in it").click();
  await expect(contents.getByRole('listitem')).toHaveText(['1Wide Grip Pulldown', '2Seated Row']);

  // Once something is ticked, the card's progress takes over from the preview.
  await page.getByRole('button', { name: 'Start Workout' }).click();
  // A custom workout's sets start empty.
  await setNumericValue(page.getByLabel('Weight, set 1').first(), '120');
  await setNumericValue(page.getByLabel('Reps, set 1').first(), '10');
  await page.getByRole('button', { name: 'Mark set 1 complete' }).first().click();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByRole('button', { name: 'Continue Workout' })).toBeVisible();
  await expect(contents).toHaveCount(0);
});

test('the clock runs from the first tick, and the summary has the duration', async ({ page }) => {
  await page.clock.install();
  await startToday(page);

  const clock = page.getByTestId('elapsed-time');
  await expect(clock).toHaveText(/0:00$/);
  // Opening a workout is not starting one.
  await page.clock.runFor(5_000);
  await expect(clock).toHaveText(/0:00$/);

  await page.getByRole('button', { name: /^Mark set \d+ complete$/ }).first().click();
  await page.clock.runFor(3_000);
  await expect(clock).toHaveText(/0:0[2-4]$/);

  await page.clock.runFor(47 * 60_000);
  await expect(clock).toHaveText(/47:0\d$/);

  // Finished without ever leaving the page: this is the case that said "—".
  await page.getByRole('button', { name: 'Complete Workout' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Finish workout' }).click();
  await page.clock.runFor(2_000);
  await expect(page.getByTestId('finish-duration')).toHaveText('47min');

  const stored = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return list[list.length - 1]?.duration;
  });
  expect(stored).toBe(47);
});

test('a finished workout shows how long it took instead of a running clock', async ({ page }) => {
  await page.clock.install();
  await startToday(page);
  await page.getByRole('button', { name: /^Mark set \d+ complete$/ }).first().click();
  await page.clock.runFor(30 * 60_000);
  await page.getByRole('button', { name: 'Complete Workout' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Finish workout' }).click();
  await page.clock.runFor(2_000);
  await page.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'View Details' }).click();
  await expect(page.getByTestId('elapsed-time')).toHaveText('30 min');
  await page.clock.runFor(10_000);
  await expect(page.getByTestId('elapsed-time')).toHaveText('30 min');
});
