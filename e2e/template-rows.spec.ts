import { test, expect } from '@playwright/test';

/**
 * The template picker's rows, and the way in to a core exercise's picture.
 *
 * No core-block exercise ships a picture yet. The workout screen is ready for
 * them: drop `crunch.jpg` (and so on) into public/exercise-images, list it,
 * and the name becomes tappable. Until then nothing must offer a picture that
 * does not exist.
 */

test('a core exercise with no picture offers none', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await expect(page.getByText('Core Block')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Show how to do / })).toHaveCount(0);
});

test('a template row says how many exercises it has, and nothing that gets cut off', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  const row = page.getByRole('button', { name: 'Chest Day', exact: true });
  await expect(row).toContainText(/^Chest Day\d+ exercises$/);
});
