import { test, expect, type Page } from '@playwright/test';

/**
 * Reproduces a real report, then the way out of it.
 *
 * A user's Seated Dip showed a personal best of 140lbs — a Chest Day template
 * default, ticked through once in July 2025 and never lifted. It sat there for
 * a year telling her she was down 25lbs, with nothing on screen to say where
 * the number came from and no way to remove it.
 *
 * So: the date has to be visible, and the figure has to be resettable.
 */

const OLD_SESSION = {
  id: 4001,
  date: '2025-07-29',
  type: 'Chest Day',
  completed: true,
  abs: [],
  cardio: null,
  exercises: [
    {
      machine: 'Seated Dip',
      equipment: 'machine',
      region: 'Outer Triceps',
      feel: 'Medium',
      completed: true,
      sets: [
        { weight: 140, reps: 10, rest: '1:00', completed: true },
        { weight: 140, reps: 10, rest: '1:00', completed: true },
      ],
    },
  ],
};

/** Today's session, so the old one counts as history rather than in-progress. */
const TODAY_SESSION = (date: string) => ({
  id: 4002,
  date,
  type: 'Hers',
  completed: false,
  abs: [],
  cardio: null,
  exercises: [
    {
      machine: 'Seated Dip',
      equipment: 'machine',
      region: 'Outer Triceps',
      feel: 'Medium',
      completed: false,
      sets: [{ weight: 115, reps: 10, rest: '1:00', completed: false }],
    },
  ],
});

async function openWorkoutWithStaleBest(page: Page) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  await page.addInitScript(
    ([old, todaySession]) => {
      localStorage.setItem('ironpath_tour_seen', '1');
      localStorage.setItem('ironpath_workouts', JSON.stringify([old, todaySession]));
    },
    [OLD_SESSION, TODAY_SESSION(iso)] as const,
  );

  await page.goto('/workout/4002');
  await page.waitForTimeout(1500);
  await expect(page.getByText('Seated Dip').first()).toBeVisible();
}

test('a personal best says when it was set', async ({ page }) => {
  await openWorkoutWithStaleBest(page);

  await expect(page.getByText(/BEST:/)).toBeVisible();
  await expect(page.getByText('140 lbs × 10 reps')).toBeVisible();

  // The part that would have caught this a year ago.
  await expect(page.getByText(/2025/)).toBeVisible();
});

test('a personal best can be reset, and the line goes quiet until you log again', async ({ page }) => {
  await openWorkoutWithStaleBest(page);

  await page.getByText(/BEST:/).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByText(/Reset personal best/i)).toBeVisible();

  // Framing check: this is not presented as fixing a mistake.
  const dialog = await page.getByRole('alertdialog').innerText();
  expect(dialog).not.toMatch(/incorrect|wrong|mistake|error/i);

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForTimeout(600);

  await expect(page.getByText(/BEST:/)).toHaveCount(0);
});

test('a figure you name yourself is shown as yours', async ({ page }) => {
  await openWorkoutWithStaleBest(page);

  await page.getByText(/BEST:/).click();
  await page.getByRole('textbox', { name: 'Personal best weight' }).fill('90');
  await page.getByRole('textbox', { name: 'Personal best reps' }).fill('10');
  await page.getByRole('button', { name: /Set as my best/i }).click();
  await page.waitForTimeout(600);

  await expect(page.getByText('90 lbs × 10 reps')).toBeVisible();
  await expect(page.getByText('set by you')).toBeVisible();
});

test('a reset survives a reload, because it is stored not remembered', async ({ page }) => {
  await openWorkoutWithStaleBest(page);

  await page.getByText(/BEST:/).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.waitForTimeout(600);
  await expect(page.getByText(/BEST:/)).toHaveCount(0);

  await page.reload();
  await page.waitForTimeout(1500);

  await expect(page.getByText('Seated Dip').first()).toBeVisible();
  await expect(page.getByText(/BEST:/), 'the 140 must not come back').toHaveCount(0);
});
