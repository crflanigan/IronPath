import { test, expect } from '@playwright/test';

/**
 * On a fresh install, History rendered "Workout Types" and "Recent Workouts"
 * as headed cards containing nothing at all — roughly 110px of void each, in
 * both themes, with no copy explaining why. That reads as something failing to
 * load rather than as "you have not trained yet", on one of the first screens
 * a new user is likely to reach.
 *
 * Export to CSV on the same screen downloaded a 31-byte file — a header row
 * and nothing else — with no indication anything was amiss.
 */

test('a first-run History explains itself instead of showing empty cards', async ({ page }) => {
  await page.goto('/history');
  await page.waitForTimeout(1200);

  // Both cards are still there — the headings are the page's structure.
  await expect(page.getByText('Workout Types')).toBeVisible();
  await expect(page.getByText('Recent Workouts')).toBeVisible();

  // ...but neither is a void any more.
  await expect(page.getByText(/Nothing here yet/i)).toBeVisible();
  await expect(page.getByText(/No completed workouts yet/i)).toBeVisible();
});

test('exporting CSV with nothing logged says so rather than downloading a header row', async ({ page }) => {
  await page.goto('/history');
  await page.waitForTimeout(1200);

  let downloadStarted = false;
  page.on('download', () => { downloadStarted = true; });

  await page.getByRole('button', { name: /Export to CSV/i }).click();
  // The toast renders its title and an aria-live status with the same words,
  // so both match. Either proves it fired.
  await expect(page.getByText(/Nothing to export yet/i).first()).toBeVisible();

  await page.waitForTimeout(700);
  expect(downloadStarted, 'an empty CSV should not have been downloaded').toBe(false);
});
