import { test, expect, type Page } from '@playwright/test';
import { setNumericValue } from './helpers';

/**
 * A finished exercise folds to one line.
 *
 * The workout page measured 4628px — five and a half screens — because a
 * completed card is ~304px and looks exactly like an unfinished one. Reaching
 * the exercise you are actually on meant scrolling past everything already
 * done, on every set rather than once per session.
 *
 * The subtle rule these tests exist to hold is *when* a card folds. Folding on
 * arrival is the point; folding under a finger that has just tapped a set
 * circle is a bug — it pulls 240px out from under the tap, and those circles
 * are the easiest thing in this app to hit by mistake, so the fold would hide
 * the very control needed to undo the mis-tap.
 */

const set = (weight: number, completed: boolean) => ({
  weight,
  reps: 10,
  rest: '1:00',
  completed,
});

/** Three lifts: two behind you, one in front. */
function session() {
  return {
    id: 1,
    date: '2026-07-25',
    type: 'Chest Day',
    completed: false,
    duration: null,
    startedAt: null,
    // As `createWorkout` stamps them. Without these the record can never
    // autosave at all, which is a separate bug and not what this file tests.
    createdAt: '2026-07-25T12:00:00.000Z',
    updatedAt: '2026-07-25T12:00:00.000Z',
    abs: [],
    cardio: null,
    exercises: [
      {
        code: 'S24',
        machine: 'Wide Grip Pulldown',
        region: 'Back',
        feel: 'Medium',
        completed: true,
        // Heaviest in the middle, so "top set" cannot pass by reading the last.
        sets: [set(100, true), set(110, true), set(105, true)],
      },
      {
        code: 'S25',
        machine: 'Seated Row',
        region: 'Back',
        feel: 'Medium',
        completed: true,
        sets: [set(120, true), set(120, true), set(120, true)],
      },
      {
        code: 'S26',
        machine: 'Preacher Curl',
        region: 'Arms',
        feel: 'Medium',
        completed: false,
        sets: [set(0, false)],
      },
    ],
  };
}

/** The height of an exercise's card, folded or not. */
async function cardHeight(page: Page, machine: string): Promise<number> {
  const box = await page
    .getByRole('button', { name: new RegExp(`^(Show|Hide) ${machine}$`) })
    .locator('xpath=ancestor::div[contains(@class,"border-l-4")][1]')
    .boundingBox();
  if (!box) throw new Error(`no card for ${machine}`);
  return box.height;
}

/**
 * Finishing the last exercise triggers the end-of-workout celebration.
 *
 * Waited for rather than polled once: it renders a beat after the tap, and
 * while it is open Radix marks the rest of the page `aria-hidden`, so a missed
 * dismissal makes every later `getByRole` look like the element never existed.
 */
async function dismissCelebration(page: Page) {
  const close = page.getByRole('button', { name: 'Close', exact: true });
  await close.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await close.count()) await close.click();
  await close.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(200);
}

async function open(page: Page, record: unknown = session()) {
  // Seeded once, not on every navigation: init scripts re-run on each `goto`,
  // and a second one would write the fixture back over whatever the app saved.
  await page.addInitScript(w => {
    if (!localStorage.getItem('ironpath_workouts')) {
      localStorage.setItem('ironpath_workouts', JSON.stringify([w]));
    }
    localStorage.setItem('ironpath_current_id', '1');
    localStorage.setItem('ironpath_tour_seen', '1');
  }, record);
  await page.goto('/workout/1');
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.count()) await close.click();
  await page.waitForTimeout(600);
}

test('a finished exercise arrives folded, showing its heaviest set', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('button', { name: 'Show Wide Grip Pulldown' })).toBeVisible();
  // The heaviest of the two, not the last one entered.
  await expect(page.getByText('110 lbs × 10 reps')).toBeVisible();

  // Folded means gone, not hidden: nothing to scroll past and nothing to tap.
  await expect(page.getByLabel('Weight, set 1')).toHaveCount(1); // only Preacher Curl's
  await expect(page.getByLabel('Mark set 1 complete')).toHaveCount(1);
});

test('the exercise you are on stays open', async ({ page }) => {
  await open(page);

  await expect(page.getByRole('button', { name: 'Show Preacher Curl' })).toHaveCount(0);
  await expect(page.getByText('Arms • Medium Feel')).toBeVisible();

  // The only one open, so the only one with editable sets.
  const weights = page.getByLabel('Weight, set 1');
  await expect(weights).toHaveCount(1);
  await expect(weights).toBeVisible();
});

test('tapping a folded exercise opens it, and tapping it again folds it back', async ({ page }) => {
  await open(page);

  await page.getByRole('button', { name: 'Show Seated Row' }).click();
  await expect(page.getByLabel('Weight, set 1')).toHaveCount(2);
  await expect(page.getByText('Back • Medium Feel')).toBeVisible();

  await page.getByRole('button', { name: 'Hide Seated Row' }).click();
  await expect(page.getByRole('button', { name: 'Show Seated Row' })).toBeVisible();
  await expect(page.getByLabel('Weight, set 1')).toHaveCount(1);
});

test('finishing an exercise does not fold it under your finger', async ({ page }) => {
  // The guard on seeding from completion at *mount*. If this ever folds on the
  // tick, an accidental tap on a set circle hides the control that undoes it,
  // and everything below jumps up into where the eye already was.
  await open(page);

  await setNumericValue(page.getByLabel('Weight, set 1'), '80');
  await setNumericValue(page.getByLabel('Reps, set 1'), '12');
  await page.getByLabel('Mark set 1 complete').click();
  await dismissCelebration(page);

  await expect(page.getByRole('button', { name: 'Show Preacher Curl' })).toHaveCount(0);
  await expect(page.getByLabel('Weight, set 1')).toBeVisible();
  // It is finished — the fold control is offered, just not taken for you.
  await expect(page.getByRole('button', { name: 'Hide Preacher Curl' })).toBeVisible();
});

test('leaving and coming back folds what you finished', async ({ page }) => {
  await open(page);

  await setNumericValue(page.getByLabel('Weight, set 1'), '80');
  await setNumericValue(page.getByLabel('Reps, set 1'), '12');
  await page.getByLabel('Mark set 1 complete').click();
  await dismissCelebration(page);

  // Wait on the write, not on a guess at the autosave debounce — and on the
  // whole of it, since the numbers and the completion can land in either order.
  await page.waitForFunction(
    () => {
      const w = JSON.parse(localStorage.getItem('ironpath_workouts') || '[]')[0] as
        | {
            exercises: {
              machine: string;
              completed: boolean;
              sets: { weight?: number; reps?: number }[];
            }[];
          }
        | undefined;
      const e = w?.exercises.find(x => x.machine === 'Preacher Curl');
      return !!e?.completed && e.sets[0]?.weight === 80 && e.sets[0]?.reps === 12;
    },
    null,
    { timeout: 10000 },
  );

  await page.goto('/workout/1');
  await dismissCelebration(page);

  await expect(page.getByRole('button', { name: 'Show Preacher Curl' })).toBeVisible();
  await expect(page.getByText('80 lbs × 12 reps')).toBeVisible();
});

test('a folded card costs a line instead of a screenful', async ({ page }) => {
  // Measured on the card rather than the page, because the saving scales with
  // how many lifts you have done and the fixture here only has two. Casey's
  // eleven-exercise session went 4628px to 2208px on this change.
  await open(page);

  const folded = await cardHeight(page, 'Seated Row');
  expect(folded).toBeLessThan(80);

  await page.getByRole('button', { name: 'Show Seated Row' }).click();
  await page.waitForTimeout(300);

  const opened = await cardHeight(page, 'Seated Row');
  expect(opened).toBeGreaterThan(200);
  expect(folded).toBeLessThan(opened / 3);
});
