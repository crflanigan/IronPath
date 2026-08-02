import { test, expect, type Page } from '@playwright/test';

/**
 * The calendar had no memory and no way home.
 *
 * Browse back two months to check what you lifted, open the session, come back
 * — and it had reset to today, because the page unmounts and its
 * `useState(new Date())` runs again. Six months back meant six taps to return.
 *
 * And there was no "Today" control at all, so once you had wandered, the only
 * route back was the arrow, the same number of times. That is what made the
 * pre-#152 "Start Today's Workout" feel missed: it always acted on today
 * whatever was selected, so it doubled as an escape hatch — but only by
 * claiming one day while acting on another.
 */

const monthOnScreen = (page: Page) =>
  page.evaluate(() => (document.body.innerText.match(/[A-Z][a-z]+ \d{4}/) || ['?'])[0]);

async function openCalendar(page: Page) {
  await page.addInitScript(() => localStorage.setItem('ironpath_tour_seen', '1'));
  await page.goto('/');
  await page.waitForTimeout(900);
}

async function back(page: Page, times: number) {
  for (let i = 0; i < times; i++) {
    await page.getByRole('button', { name: 'Previous month' }).click();
    await page.waitForTimeout(300);
  }
}

test('coming back from a workout returns you to the month you were on', async ({ page }) => {
  await openCalendar(page);
  const start = await monthOnScreen(page);

  await back(page, 2);
  const browsed = await monthOnScreen(page);
  expect(browsed, 'two taps should have moved the calendar').not.toBe(start);

  await page.getByRole('button', { name: '15', exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Start This Workout|Start Today's Workout/ }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1200);

  await page.getByRole('button', { name: 'Go back' }).click();
  await page.waitForTimeout(1200);

  expect(await monthOnScreen(page), 'the browsed month should still be on screen').toBe(browsed);
});

test('the browser back button restores it too', async ({ page }) => {
  await openCalendar(page);
  await back(page, 3);
  const browsed = await monthOnScreen(page);

  await page.getByRole('button', { name: '10', exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Start This Workout|Start Today's Workout/ }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1200);

  // Not the in-app arrow — the real back button, which a PWA swipe also uses.
  await page.goBack();
  await page.waitForTimeout(1200);

  expect(await monthOnScreen(page)).toBe(browsed);
});

test('a fresh visit still lands on today', async ({ page }) => {
  await openCalendar(page);
  await back(page, 4);
  const browsed = await monthOnScreen(page);

  // A new context is a new session, which is where the position lives.
  const fresh = await page.context().browser()!.newContext();
  const other = await fresh.newPage();
  await other.addInitScript(() => localStorage.setItem('ironpath_tour_seen', '1'));
  await other.goto(page.url());
  await other.waitForTimeout(900);

  const now = new Date();
  const expected = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  expect(await monthOnScreen(other), 'opening the app afresh must start at today').toBe(expected);
  expect(await monthOnScreen(other)).not.toBe(browsed);
  await fresh.close();
});

test('Today appears only when you have wandered, and takes you back', async ({ page }) => {
  await openCalendar(page);

  const today = page.getByRole('button', { name: 'Today', exact: true });
  await expect(today, 'nothing to escape from on the current month').toHaveCount(0);

  await back(page, 2);
  const browsed = await monthOnScreen(page);
  await expect(today).toBeVisible();

  await today.click();
  await page.waitForTimeout(500);

  const now = new Date();
  expect(await monthOnScreen(page)).toBe(
    now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );
  expect(await monthOnScreen(page)).not.toBe(browsed);

  // And the one-tap-to-train path is back, without the button having lied.
  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();
  await expect(today, 'it hides again once you are home').toHaveCount(0);
});
