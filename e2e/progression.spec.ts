import { test, expect, type Page } from '@playwright/test';

/**
 * Progress over time, built sentence-first.
 *
 * The insight is "125 lbs, up 45 since Jul 2025". The shape beside it is
 * decoration on top of that, which is why these tests assert on the words
 * before anything visual — if the drawing ever went away the feature would
 * still work, and that is the property worth protecting.
 */

const session = (id: number, date: string, machine: string, weight: number) => ({
  id,
  date,
  type: "Teresa's",
  completed: true,
  abs: [],
  cardio: null,
  duration: 65,
  exercises: [
    {
      machine,
      equipment: 'machine',
      region: 'Back',
      feel: 'Medium',
      completed: true,
      sets: [{ weight, reps: 10, rest: '1:00', completed: true }],
    },
  ],
});

/** A year of Seated Row, 80 → 125, which is the story this exists to tell. */
const YEAR = [
  ['2025-07-22', 80], ['2025-08-05', 90], ['2025-09-23', 100],
  ['2025-10-14', 105], ['2025-12-11', 120], ['2026-07-21', 125],
] as const;

async function openHistory(page: Page, workouts: unknown[]) {
  await page.addInitScript(w => {
    localStorage.setItem('ironpath_tour_seen', '1');
    localStorage.setItem('ironpath_workouts', JSON.stringify(w));
  }, workouts);
  await page.goto('/history');
  await page.waitForTimeout(1400);
}

test('a year of training reads as one sentence', async ({ page }) => {
  await openHistory(page, YEAR.map(([d, w], i) => session(i + 1, d, 'Seated Row', w)));

  await expect(page.getByText('Your lifts')).toBeVisible();
  await expect(page.getByText('Seated Row', { exact: true })).toBeVisible();
  await expect(page.getByText(/125 lbs · up 45 since Jul 2025/)).toBeVisible();
});

test('tapping a lift opens its detail', async ({ page }) => {
  await openHistory(page, YEAR.map(([d, w], i) => session(i + 1, d, 'Seated Row', w)));

  await page.getByRole('button', { name: /Seated Row/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await expect(dialog.getByText(/125 lbs · up 45 since Jul 2025/)).toBeVisible();
  // Exact, because "Jul 2025" also appears inside the sentence above.
  await expect(dialog.getByText('Jul 2025', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Jul 2026', { exact: true })).toBeVisible();

  await expect(dialog.getByText('Now')).toBeVisible();
  await expect(dialog.getByText('When you started')).toBeVisible();
  await expect(dialog.getByText('Sessions logged')).toBeVisible();
  await expect(dialog.getByText('80 lbs')).toBeVisible();
});

test('a number going down is stated, not scolded', async ({ page }) => {
  // Injuries and deloads are normal, and this app has already been caught once
  // telling someone they were underperforming against a figure they never set.
  await openHistory(page, [
    session(1, '2025-07-22', 'Seated Row', 125),
    session(2, '2026-07-21', 'Seated Row', 100),
  ]);

  await expect(page.getByText(/100 lbs · down 25 since Jul 2025/)).toBeVisible();

  const card = await page.getByText('Your lifts').locator('xpath=ancestor::div[1]').innerText();
  expect(card).not.toMatch(/lost|worse|fail|behind|regress/i);
});

test('one session does not pretend to be a trend', async ({ page }) => {
  await openHistory(page, [session(1, '2026-07-21', 'Seated Row', 80)]);
  await expect(page.getByText(/80 lbs · first session/)).toBeVisible();
});

test('untouched template weights never appear as progress', async ({ page }) => {
  // The whole reason `completed` is required: presets arrive pre-filled.
  const untouched = session(1, '2026-07-21', 'Seated Row', 230);
  untouched.exercises[0].sets[0].completed = false;

  await openHistory(page, [untouched]);
  await expect(page.getByText(/Nothing here yet/)).toBeVisible();
  await expect(page.getByText(/230 lbs/)).toHaveCount(0);
});

test('a reset hides the sessions it was meant to forget', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'ironpath_personal_best_resets',
      JSON.stringify([{ machine: 'Seated Dip', resetOn: '2026-01-01' }]),
    );
  });
  await openHistory(page, [
    session(1, '2025-07-29', 'Seated Dip', 140), // the stale template default
    session(2, '2026-06-01', 'Seated Dip', 90),
    session(3, '2026-07-01', 'Seated Dip', 110),
  ]);

  // Up 20 from the real starting point, not down 30 from a figure never lifted.
  await expect(page.getByText(/110 lbs · up 20 since Jun 2026/)).toBeVisible();
  await expect(page.getByText(/down 30/)).toHaveCount(0);
});
