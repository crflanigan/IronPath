import { test, expect, type Page } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * `BEST:` used to render a constant from the workout template — and not even a
 * distinct one: it was the heaviest set in that same template, relabelled as a
 * personal record. Every user saw the same number on their first ever workout,
 * and it never moved afterwards, so the weight-change arrow measured progress
 * against a figure from a JSON file.
 *
 * The prefilled weights in a template are a different thing and are unchanged:
 * loading a preset and going is the point of presets. What is asserted here is
 * only the claim about what you have lifted.
 */

async function startTodaysWorkout(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1200);
}

test('a first workout claims no personal record, but still arrives pre-filled', async ({ page }) => {
  await startTodaysWorkout(page);

  // Nothing has been logged, so there is nothing true to say.
  await expect(page.getByText(/BEST:/)).toHaveCount(0);

  // The convenience is untouched: the template's weights are still there to
  // start from, which is the whole reason to load a preset.
  const firstWeight = page.getByRole('textbox', { name: /^Weight, set 1$/ }).first();
  await expect(firstWeight).not.toHaveValue('');
});

test('BEST reflects what was actually logged, in a later session', async ({ page }) => {
  // Log a session by hand, then plant a second workout for a different day so
  // the first becomes history rather than the session in progress.
  await startTodaysWorkout(page);

  const weight = page.getByRole('textbox', { name: /^Weight, set 1$/ }).first();
  await setNumericValue(weight, '145');
  const reps = page.getByRole('textbox', { name: /^Reps, set 1$/ }).first();
  await setNumericValue(reps, '7');

  // Tick it. Only completed sets count — otherwise the template's own
  // prefilled weights would become the record as soon as this workout
  // became history.
  await page.getByRole('button', { name: /^Mark set 1 complete$/ }).first().click();
  await page.waitForTimeout(2600); // let autosave settle

  const machine = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('ironpath_workouts') || '[]');
    return stored[0]?.exercises?.[0]?.machine ?? null;
  });
  expect(machine, 'expected a stored workout to read back').not.toBeNull();

  // Re-open as a *new* session: duplicate the record under a fresh id and date,
  // so the logged one counts as history.
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('ironpath_workouts') || '[]');
    const copy = JSON.parse(JSON.stringify(stored[0]));
    copy.id = 9001;
    copy.date = '2099-01-01';
    copy.exercises = copy.exercises.map((e: { sets: unknown[] }) => ({
      ...e,
      sets: (e.sets as Record<string, unknown>[]).map(s => ({ ...s, weight: undefined, reps: undefined })),
    }));
    localStorage.setItem('ironpath_workouts', JSON.stringify([...stored, copy]));
  });

  await page.goto('/workout/9001');
  await page.waitForTimeout(1500);

  // The record is now real, and it is the number that was logged.
  await expect(page.getByText(/BEST:/).first()).toBeVisible();
  await expect(page.getByText('145 lbs × 7 reps').first()).toBeVisible();
});
