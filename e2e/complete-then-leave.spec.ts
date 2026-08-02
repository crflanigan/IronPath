import { test, expect } from '@playwright/test';

/**
 * Completing a workout and going back raised "Changed in another tab", with
 * one tab open.
 *
 * `handleCompleteWorkout` saved without passing `expectedUpdatedAt` and never
 * refreshed the ref that tracks it, so the stored `updatedAt` moved on while
 * this tab still believed the older value. Leaving the screen then triggers
 * the flush, which *does* send the expectation — now stale by exactly one
 * write — and the concurrency check correctly reports a conflict that never
 * happened.
 *
 * It also left `lastSavedRef` behind, so the flush ran at all despite there
 * being nothing new to write.
 *
 * The existing cardio-only spec already walks this flow and passes, because it
 * asserts on the URL and on storage. Nothing was watching for a toast.
 */

test('completing a workout and going back does not claim another tab changed it', async ({ page }) => {
  const autosaveErrors: string[] = [];
  page.on('console', m => {
    if (m.type() === 'error' && /Autosave failed/i.test(m.text())) autosaveErrors.push(m.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem('ironpath_tour_seen', '1');
    localStorage.setItem('ironpath_template_tour_seen', '1');
    localStorage.setItem('ironpath_builder_tour_seen', '1');
  });

  // The shape this was reported against: a custom, cardio-only session.
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  await page.getByLabel('Workout name').fill('Just Cardio');
  await page.getByRole('button', { name: 'Save Workout' }).click();
  await page.getByRole('button', { name: 'Just Cardio', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  await page.getByPlaceholder('mm:ss').first().fill('20:00');
  await page.locator('button[aria-label^="Mark cardio"]').click();
  await page.waitForTimeout(2600);

  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.count()) await close.click();

  await page.getByRole('button', { name: 'Complete Workout' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });

  // The navigation above is what fires the flush; give it room to misfire.
  await page.waitForTimeout(1500);

  await expect(
    page.getByText(/Changed in another tab/i),
    'only one tab is open; nothing changed anywhere else',
  ).toHaveCount(0);
  await expect(page.getByText(/changed somewhere else/i)).toHaveCount(0);

  expect(autosaveErrors, 'the flush after completing should not fail').toEqual([]);
});
