import { test, expect, type Page } from '@playwright/test';

/**
 * Workout duration must be measured or absent — never invented.
 *
 * It used to be `exercises * 5 + abs * 2 + cardio`, which is exactly 82 for
 * the default workout no matter how long you were in the gym, and it fed both
 * Avg Duration and the exports. A fabricated number that looks measured is
 * worse than no number, because it ends up in backups.
 */

function iso(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A workout ready to complete, with `startedAt` under our control. */
function ready(startedAt: string | null, daysAgo = 0) {
  return {
    id: 1,
    date: iso(daysAgo),
    type: 'Chest Day',
    exercises: [{
      code: 'S24', machine: 'Adjustable Cable Crossover', region: 'Chest Pecs',
      feel: 'Medium', sets: [{ weight: 60, reps: 15, rest: '1:00', completed: true }],
      bestWeight: 90, bestReps: 15, completed: true,
    }],
    abs: [],
    cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed: true },
    completed: false,
    duration: null,
    startedAt,
  };
}

async function completeAndRead(page: Page, record: unknown) {
  await page.addInitScript(([w]) => {
    localStorage.setItem('ironpath_workouts', JSON.stringify([w]));
    localStorage.setItem('ironpath_current_id', '1');
    localStorage.setItem('ironpath_tour_seen', '1');
  }, [record]);

  await page.goto('/workout/1');
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.count()) await close.click();
  await page.getByRole('button', { name: 'Complete Workout' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await page.waitForTimeout(500);

  return page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return { duration: list[0]?.duration, completed: list[0]?.completed };
  });
}

test('a workout started 47 minutes ago records 47 minutes', async ({ page }) => {
  const started = new Date(Date.now() - 47 * 60_000).toISOString();
  const r = await completeAndRead(page, ready(started));

  expect(r.completed).toBe(true);
  // Not 82. Not a count of exercises. The elapsed time.
  expect(r.duration).toBeGreaterThanOrEqual(46);
  expect(r.duration).toBeLessThanOrEqual(48);
});

test('a tab left open overnight records nothing rather than 14 hours', async ({ page }) => {
  const started = new Date(Date.now() - 14 * 60 * 60_000).toISOString();
  const r = await completeAndRead(page, ready(started));

  expect(r.completed, 'the workout should still complete').toBe(true);
  expect(r.duration, 'an implausible elapsed time was recorded as fact').toBeNull();
});

test('a workout with no start time records no duration', async ({ page }) => {
  // Every workout stored before durations were measured looks like this.
  const r = await completeAndRead(page, ready(null));

  expect(r.completed).toBe(true);
  expect(r.duration, 'a duration was invented with nothing to measure').toBeNull();
});

test('the start time is stamped on the first change, not on creation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ironpath_tour_seen', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1200);

  const beforeAnyChange = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return list[list.length - 1]?.startedAt ?? null;
  });
  expect(beforeAnyChange, 'the clock started before the user did anything').toBeNull();

  await page.locator('button[aria-label^="Mark set"]').first().click();
  await page.waitForTimeout(2800);

  const afterChange = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return list[list.length - 1]?.startedAt ?? null;
  });
  expect(afterChange, 'no start time was recorded on the first change').not.toBeNull();
});
