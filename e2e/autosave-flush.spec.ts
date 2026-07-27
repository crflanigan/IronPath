import { test, expect, type Page } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * Autosave must not lose the last thing you logged.
 *
 * The debounce is trailing and 2s long, and the effect that owns it cancels
 * the pending timer on cleanup. That is correct while the timer is merely
 * being restarted by the next keystroke, and wrong when the screen is going
 * away — so every exit path dropped the write.
 *
 * Measured before the fix: 700ms after an edit the value was gone, 2500ms
 * after it was saved. Every test here edits and leaves well inside that
 * window, which is exactly what "log the set, pocket the phone" looks like.
 */

const WINDOW_MS = 600; // comfortably inside the 2s debounce

async function openWorkoutAndEdit(page: Page, value: string) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  // Let the initial save settle so we are measuring the edit, not the create.
  await page.waitForTimeout(2600);

  await setNumericValue(page.getByLabel('Weight').first(), value);
  await page.waitForTimeout(WINDOW_MS);
}

function persisted(page: Page, value: string) {
  return page.evaluate(
    v => (localStorage.getItem('ironpath_workouts') ?? '').includes(`"weight":${v}`),
    value,
  );
}

test('the in-app back arrow does not discard the last edit', async ({ page }) => {
  await openWorkoutAndEdit(page, '185');
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);

  expect(await persisted(page, '185'), 'edit lost on in-app back').toBe(true);
});

test('browser back does not discard the last edit', async ({ page }) => {
  await openWorkoutAndEdit(page, '186');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  expect(await persisted(page, '186'), 'edit lost on browser back').toBe(true);
});

test('backgrounding the app does not discard the last edit', async ({ page }) => {
  // A phone being locked or the app being switched away from — on a phone in
  // a gym this is the most common way the workout screen stops being watched.
  await openWorkoutAndEdit(page, '187');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);

  expect(await persisted(page, '187'), 'edit lost when backgrounded').toBe(true);
});

test('a completed set survives leaving immediately', async ({ page }) => {
  // Ticking a set is a change like any other, and the tick is the last thing
  // you do before putting the phone down.
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await page.waitForTimeout(2600);

  const before = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  await page.locator('button[aria-label^="Mark set"]').first().click();
  await page.waitForTimeout(WINDOW_MS);
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);

  const after = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  expect(after, 'completed set lost on leaving').not.toBe(before);
});

test('leaving without changing anything writes nothing and says nothing', async ({ page }) => {
  // The flush must be a no-op when there is nothing to save, or it would
  // rewrite storage and raise a toast every time you back out of a workout.
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await page.waitForTimeout(2600);

  const before = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));
  expect(after).toBe(before);
  await expect(page.getByText('Auto-saved')).toHaveCount(0);
});

test('the flush cannot undo a completed workout', async ({ page }) => {
  // This exists because the flush is a *write* on the way out, and completing
  // a workout also navigates away. If the ref the flush reads were stale, the
  // save-on-exit would quietly overwrite `completed: true` with false and the
  // session would stop counting — a regression introduced by the fix itself.
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  await page.addInitScript(([d]) => {
    const workout = {
      id: 1,
      date: d,
      type: 'Chest Day',
      exercises: [{
        code: 'S24', machine: 'Adjustable Cable Crossover', region: 'Chest Pecs',
        feel: 'Medium',
        sets: [{ weight: 60, reps: 15, rest: '1:00', completed: true }],
        bestWeight: 90, bestReps: 15, completed: true,
      }],
      abs: [],
      cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed: true },
      completed: false,
      duration: null,
    };
    localStorage.setItem('ironpath_workouts', JSON.stringify([workout]));
    localStorage.setItem('ironpath_current_id', '1');
    localStorage.setItem('ironpath_tour_seen', '1');
  }, [date]);

  await page.goto('/workout/1');

  // A workout seeded at 100% fires the celebration dialog on mount, which
  // sits over the page. Worth noting in its own right: the celebration is
  // reached without the workout being recorded as completed (#162).
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.count()) {
    await close.click();
  }

  await page.getByRole('button', { name: 'Complete Workout' }).click();

  // It navigates back on a timer; wait for that, plus the flush behind it.
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await page.waitForTimeout(600);

  const stored = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return { completed: list[0]?.completed, duration: list[0]?.duration };
  });

  expect(stored.completed, 'the save-on-exit reverted the completion').toBe(true);
  // This fixture has no `startedAt`, so there is nothing to measure and no
  // duration is the right answer. It used to assert a number here, which was
  // only ever the fabricated `exercises * 5 + abs * 2 + cardio`. Measured
  // durations are covered in workout-duration.spec.ts.
  expect(stored.duration).toBeNull();
});
