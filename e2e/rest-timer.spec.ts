import { test, expect, type Page } from '@playwright/test';

/**
 * The rest countdown, and the standing note on each exercise.
 *
 * Every set already had a rest time; it was a number in a box and nothing
 * counted it. The timer starts from the tick that completes a set.
 */

async function startWorkout(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
}

const firstTick = (page: Page) => page.getByRole('button', { name: /^Mark set \d+ complete$/ }).first();

test('ticking a set starts the rest countdown from that set’s rest time', async ({ page }) => {
  await startWorkout(page);
  await expect(page.getByTestId('rest-timer')).toHaveCount(0);

  await firstTick(page).click();

  const timer = page.getByTestId('rest-timer');
  await expect(timer).toBeVisible();
  // Built-in sets rest for a minute or ninety seconds; either way it has begun.
  await expect(timer.getByTestId('rest-timer-remaining')).toHaveText(/^[01]:\d\d$/);

  const before = await timer.getByTestId('rest-timer-remaining').textContent();
  await page.waitForTimeout(2100);
  const after = await timer.getByTestId('rest-timer-remaining').textContent();
  expect(after, 'the count should be moving').not.toBe(before);
});

test('thirty seconds can be added, and the rest can be skipped', async ({ page }) => {
  await startWorkout(page);
  await firstTick(page).click();

  const timer = page.getByTestId('rest-timer');
  const seconds = async () => {
    const [m, s] = (await timer.getByTestId('rest-timer-remaining').textContent())!.split(':').map(Number);
    return m * 60 + s;
  };

  const before = await seconds();
  await timer.getByRole('button', { name: 'Add 30 seconds' }).click();
  expect(await seconds()).toBeGreaterThan(before + 25);

  await timer.getByRole('button', { name: 'Skip rest' }).click();
  await expect(timer).toHaveCount(0);
});

test('it says so when the rest is over, then gets out of the way', async ({ page }) => {
  await page.clock.install();
  await startWorkout(page);
  await firstTick(page).click();

  const timer = page.getByTestId('rest-timer');
  await expect(timer).toBeVisible();

  const [m, s] = (await timer.getByTestId('rest-timer-remaining').textContent())!.split(':').map(Number);
  // `runFor` fires every tick on the way, as a watched phone would. A single
  // jump past the end is the phone-was-asleep case, which skips "Go" by design.
  await page.clock.runFor((m * 60 + s + 1) * 1000);
  await expect(timer.getByTestId('rest-timer-remaining')).toHaveText('Go');

  await page.clock.runFor(5_000);
  await expect(timer).toHaveCount(0);
});

test('the timer never covers the tick it was started from', async ({ page }) => {
  await startWorkout(page);
  await firstTick(page).click();
  await expect(page.getByTestId('rest-timer')).toBeVisible();

  // The next set's tick must still be tappable with the timer up.
  await firstTick(page).click();
  await firstTick(page).click();
  await expect(page.locator('[data-exercise-card]').first().getByRole('button', { name: /^Mark set/ })).toHaveCount(0);
});

test('the timer can be switched off in Settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'Rest timer' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  // Its sound option has nothing to control any more.
  await expect(page.getByRole('switch', { name: 'Sound when rest ends' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await firstTick(page).click();
  await page.waitForTimeout(400);
  await expect(page.getByTestId('rest-timer')).toHaveCount(0);
});

test('a note stays with the exercise, not with the workout', async ({ page }) => {
  await startWorkout(page);

  const card = page.locator('[data-exercise-card]').first();
  const name = (await card.getByRole('heading').textContent())!.trim();

  await card.getByRole('button', { name: `Add a note for ${name}` }).click();
  const field = card.getByRole('textbox', { name: `Note for ${name}` });
  await field.fill('seat 4, pin 7');
  await field.press('Enter');
  await expect(card.getByTestId('exercise-note')).toHaveText('seat 4, pin 7');

  // Stored against the exercise name, which is what makes it show up next time.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ironpath_exercise_notes') ?? '{}'));
  expect(stored).toEqual({ [name]: 'seat 4, pin 7' });

  await page.reload();
  await expect(page.locator('[data-exercise-card]').first().getByTestId('exercise-note')).toHaveText('seat 4, pin 7');

  // Clearing it puts the prompt back.
  await page.locator('[data-exercise-card]').first().getByRole('button', { name: `Edit note for ${name}` }).click();
  const again = page.getByRole('textbox', { name: `Note for ${name}` });
  await again.fill('');
  await again.press('Enter');
  await expect(page.locator('[data-exercise-card]').first().getByTestId('exercise-note')).toHaveText('Add a note');
});
