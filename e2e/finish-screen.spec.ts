import { test, expect, type Page } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * The end of a workout, and the moment inside one when a record falls.
 *
 * Both are driven from a seeded history so the numbers on screen can be
 * checked against arithmetic rather than against whatever the app says.
 */

function exercise(machine: string, weight: number, done: boolean) {
  return {
    machine,
    equipment: 'machine',
    region: 'Chest',
    feel: 'Medium',
    sets: [
      { weight, reps: 10, rest: '1:00', completed: done },
      { weight, reps: 10, rest: '1:00', completed: done },
    ],
    completed: done,
  };
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Last week: Press 100, Fly 50, both finished. Today: the same, untouched. */
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(
    ({ workouts }) => {
      localStorage.setItem('ironpath_workouts', JSON.stringify(workouts));
      localStorage.setItem('ironpath_current_id', '3');
    },
    {
      workouts: [
        {
          id: 1,
          date: day(7),
          type: 'Chest Day',
          exercises: [exercise('Seated Chest Press', 100, true), exercise('Pec Fly', 50, true)],
          abs: [],
          completed: true,
          duration: 40,
        },
        {
          id: 2,
          date: day(0),
          type: 'Chest Day',
          exercises: [exercise('Seated Chest Press', 100, false), exercise('Pec Fly', 50, false)],
          abs: [],
          completed: false,
          duration: null,
        },
      ],
    },
  );
  await page.goto('/workout/2');
  await expect(page.getByRole('heading', { name: 'Chest Day' })).toBeVisible();
}

const tick = (page: Page) =>
  page.getByRole('button', { name: /^Mark set \d complete$/ }).first().click();

test('a set that beats your best says so on the row, once', async ({ page }) => {
  await seed(page);

  // Heavier than last week's 100.
  await setNumericValue(page.getByLabel('Weight, set 1').first(), '105');
  await expect(page.getByTestId('set-record')).toHaveCount(0);

  await tick(page);
  await expect(page.getByTestId('set-record')).toHaveCount(1);

  // Matching the new mark on the next set is not a second record.
  await setNumericValue(page.getByLabel('Weight, set 2').first(), '105');
  await tick(page);
  await expect(page.getByTestId('set-record')).toHaveCount(1);
});

test('matching last time is not a record', async ({ page }) => {
  await seed(page);
  await tick(page);
  await tick(page);
  await expect(page.getByTestId('set-record')).toHaveCount(0);
});

test('finishing shows what the session amounted to, and waits for you', async ({ page }) => {
  await seed(page);

  await setNumericValue(page.getByLabel('Weight, set 1').first(), '105');
  for (let i = 0; i < 4; i++) await tick(page);

  await page.getByRole('button', { name: 'Complete Workout' }).click();

  const finish = page.getByTestId('workout-finish');
  await expect(finish).toBeVisible();

  // 105x10 + 100x10 + 50x10 + 50x10
  await expect(finish.getByTestId('finish-volume')).toHaveText('3,050lbs');
  await expect(finish.getByTestId('finish-sets')).toHaveText('4');
  await expect(finish.getByTestId('finish-streak')).toHaveText('1');
  // Last week was 3,000.
  await expect(finish.getByTestId('finish-delta')).toContainText('50 lbs more than your last Chest Day');

  const bests = finish.getByTestId('finish-bests');
  await expect(bests).toContainText('New personal best');
  await expect(bests).toContainText('Seated Chest Press');
  await expect(bests).toContainText('105 lbs × 10');
  await expect(bests).toContainText('+5 lbs');
  await expect(bests).not.toContainText('Pec Fly');

  // Still here: nothing dismisses it but you.
  await page.waitForTimeout(2500);
  await expect(finish).toBeVisible();

  await finish.getByRole('button', { name: 'Done' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('ironpath_workouts')!)[1].completed),
  ).toBe(true);
});

test('a session with no records shows no trophy section', async ({ page }) => {
  await seed(page);
  for (let i = 0; i < 4; i++) await tick(page);
  await page.getByRole('button', { name: 'Complete Workout' }).click();

  const finish = page.getByTestId('workout-finish');
  await expect(finish.getByTestId('finish-volume')).toHaveText('3,000lbs');
  await expect(finish.getByTestId('finish-bests')).toHaveCount(0);
  await expect(finish.getByTestId('finish-delta')).toHaveCount(0);
});
