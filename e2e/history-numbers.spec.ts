import { test, expect, type Page } from '@playwright/test';

/**
 * The three numbers on History that were not telling the truth.
 *
 * Each is seeded rather than performed, because the point is arithmetic over a
 * known set of workouts, not the UI that produces them.
 */

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function workout(id: number, daysAgo: number, completed: boolean, type = 'Chest Day') {
  return {
    id,
    date: iso(daysAgo),
    type,
    exercises: [{
      code: 'S24', machine: 'Adjustable Cable Crossover', region: 'Chest Pecs',
      feel: 'Medium', sets: [{ weight: 60, reps: 15, rest: '1:00', completed }],
      bestWeight: 90, bestReps: 15, completed,
    }],
    abs: [],
    cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed },
    completed,
    duration: completed ? 60 : null,
  };
}

async function seed(page: Page, records: unknown[]) {
  await page.addInitScript(([r]) => {
    localStorage.setItem('ironpath_workouts', JSON.stringify(r));
    localStorage.setItem('ironpath_current_id', '999');
    localStorage.setItem('ironpath_tour_seen', '1');
  }, [records]);
  await page.goto('/history');
  await expect(page.getByText('Completion')).toBeVisible();
}

test('Completion % measures the selected window, not all of history', async ({ page }) => {
  // Ten completed workouts inside the month, forty completed ~500 days ago.
  // Everything is completed, so any honest window must read 100%.
  const recent = Array.from({ length: 10 }, (_, i) => workout(i + 1, i, true));
  const ancient = Array.from({ length: 40 }, (_, i) => workout(100 + i, 500 + i, true));
  await seed(page, [...ancient, ...recent]);

  // Dividing by the all-time total gave 20% here.
  const rate = await page.locator('text=/^\\d+%$/').first().innerText();
  expect(rate, 'completion rate is diluted by workouts outside the window').toBe('100%');
});

test('Recent Workouts shows the newest five, newest first', async ({ page }) => {
  // Ten consecutive days. The newest is day 0 — the one a returning user is
  // actually checking for.
  await seed(page, Array.from({ length: 10 }, (_, i) => workout(i + 1, i, true)));

  const rows = page.locator('text=Recent Workouts').locator('..').locator('..');
  const shown = await rows.locator('div.font-medium').allInnerTexts();
  expect(shown.length).toBeGreaterThan(0);

  const dates = await rows.locator('div.text-sm').allInnerTexts();
  const parsed = dates.map(d => new Date(d).getTime()).filter(n => !Number.isNaN(n));
  expect(parsed.length, 'no dated rows found').toBeGreaterThanOrEqual(5);

  // Descending, and the most recent workout must be present.
  const sortedDesc = [...parsed].sort((a, b) => b - a);
  expect(parsed, 'Recent Workouts is not newest-first').toEqual(sortedDesc);
  expect(Math.max(...parsed)).toBe(sortedDesc[0]);

  // Compared at day granularity: the rendered dates parse as local midnight
  // while an ISO string parses as UTC, and the offset between them is not the
  // thing under test.
  expect(
    new Date(dates[0]).toDateString(),
    "today's workout is missing from Recent Workouts",
  ).toBe(new Date().toDateString());
});

test('the headline count and Workout Types agree with each other', async ({ page }) => {
  // One completed, one abandoned. History used to report "0 Workouts" beside
  // "Chest Day — 1 workouts" after a partial session.
  await seed(page, [workout(1, 1, true), workout(2, 0, false)]);

  const headline = await page.locator('text=Workouts').first()
    .locator('..').locator('div').first().innerText();
  const typeRow = await page.locator('text=Workout Types').locator('..').locator('..')
    .locator('text=/workouts?$/').first().innerText();

  expect(headline.trim(), 'headline should count only completed').toBe('1');
  expect(typeRow, 'Workout Types counted an incomplete workout').toContain('1');
});
