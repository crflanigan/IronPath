import { test, expect } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * A real browser, booting against data written by an older build.
 *
 * The unit tests cover the storage layer directly; this checks the thing that
 * actually matters to someone who has been using the app for months — that
 * their history is still there after an update, and still there after the app
 * writes to storage again.
 */

/** Shaped like a workout saved before `equipment` existed on the schema. */
const LEGACY_WORKOUT = {
  id: 1,
  date: '2025-01-05',
  type: 'Chest Day',
  exercises: [
    {
      code: 'S24',
      machine: 'Adjustable Cable Crossover',
      region: 'Chest Pecs',
      feel: 'Medium',
      sets: [{ weight: 60, reps: 15, rest: '1:00', completed: true }],
      bestWeight: 90,
      bestReps: 15,
      completed: true,
    },
  ],
  abs: [],
  cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed: true },
  completed: true,
  duration: 45,
};

const CORRUPT_WORKOUT = { ...LEGACY_WORKOUT, id: 2, date: 'not-a-date' };

async function seedStorage(page: import('@playwright/test').Page, records: unknown[]) {
  await page.addInitScript(
    ([key, value, idKey, idValue]) => {
      localStorage.setItem(key as string, value as string);
      localStorage.setItem(idKey as string, idValue as string);
    },
    ['ironpath_workouts', JSON.stringify(records), 'ironpath_current_id', '99'],
  );
}

test('history written by an older build is still there after updating', async ({ page }) => {
  await seedStorage(page, [LEGACY_WORKOUT]);
  await page.goto('/');

  await expect(page.getByRole('button', { name: /Completed/ })).toContainText('1');
});

test('older history survives the app writing to storage again', async ({ page }) => {
  await seedStorage(page, [LEGACY_WORKOUT]);
  await page.goto('/');

  // Creating a workout rewrites the whole stored list — the moment the old
  // behaviour erased anything it had failed to parse.
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.getByRole('button', { name: 'Save Workout' }).click();

  const survived = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return stored.some((w: { date: string }) => w.date === '2025-01-05');
  });
  expect(survived).toBe(true);
});

test('an unreadable record is set aside rather than deleted', async ({ page }) => {
  await seedStorage(page, [LEGACY_WORKOUT, CORRUPT_WORKOUT]);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Completed/ })).toBeVisible();

  const quarantined = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_quarantined_workouts') ?? '[]'),
  );

  expect(quarantined).toHaveLength(1);
  expect(quarantined[0].record.id).toBe(2);
});

/**
 * `updatedAt` arrived with the two-tab concurrency check, so nothing logged
 * before that release has one — `LEGACY_WORKOUT` above included.
 *
 * `getWorkouts` used to fill the gap with `new Date()`, which invented a
 * *different* stamp on every read. The value the screen loaded was therefore
 * always older than the one the next save read back, so the check fired on
 * every autosave: the record could never be saved again, and the app blamed a
 * tab the user did not have open.
 */
test('a workout logged before updatedAt existed can still be edited', async ({ page }) => {
  const autosaveErrors: string[] = [];
  page.on('console', m => {
    if (m.type() === 'error' && /Autosave failed/i.test(m.text())) autosaveErrors.push(m.text());
  });

  await seedStorage(page, [LEGACY_WORKOUT]);
  await page.addInitScript(() => localStorage.setItem('ironpath_tour_seen', '1'));
  await page.goto('/workout/1');

  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.count()) await close.click();

  // This exercise is finished, so it arrives folded. Opening it is what
  // someone correcting an old number actually does.
  await page.getByRole('button', { name: 'Show Adjustable Cable Crossover' }).click();

  // `setNumericValue`, not `fill` — the caret-to-end race appends otherwise,
  // and a seeded 60 becomes "60165".
  await setNumericValue(page.getByLabel('Weight, set 1'), '165');

  await page.waitForFunction(
    () => {
      const w = JSON.parse(localStorage.getItem('ironpath_workouts') || '[]')[0] as
        | { exercises: { sets: { weight?: number }[] }[] }
        | undefined;
      return w?.exercises[0].sets[0].weight === 165;
    },
    null,
    { timeout: 10000 },
  );

  await expect(page.getByText(/Changed in another tab/i)).toHaveCount(0);
  await expect(page.getByText(/changed somewhere else/i)).toHaveCount(0);
  expect(autosaveErrors, 'a single tab is open; nothing changed anywhere else').toEqual([]);
});
