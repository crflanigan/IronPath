import { test, expect, type Page } from '@playwright/test';

/**
 * A cardio-only workout.
 *
 * The builder required at least one exercise, so an hour of walking or running
 * could not be recorded as a session. Every workout gets a cardio block
 * attached whichever way it is created, so an empty selection still produces
 * something to fill in and complete.
 */

async function openBuilder(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('ironpath_tour_seen', '1');
    localStorage.setItem('ironpath_template_tour_seen', '1');
    localStorage.setItem('ironpath_builder_tour_seen', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  await expect(page.getByLabel('Workout name')).toBeVisible();
}

test('a workout with no exercises can be saved', async ({ page }) => {
  await openBuilder(page);

  const save = page.getByRole('button', { name: 'Save Workout' });
  await expect(save, 'Save is disabled before a name is given').toBeDisabled();

  await page.getByLabel('Workout name').fill('Morning Run');
  // Nothing selected — this used to keep Save disabled forever.
  await expect(save, 'Save is still blocked with no exercises selected').toBeEnabled();
  await expect(page.getByText('cardio-only workout')).toBeVisible();

  await save.click();
  await expect(page.getByRole('button', { name: 'Morning Run', exact: true })).toBeVisible();
});

test('a cardio-only workout is usable and can be completed', async ({ page }) => {
  await openBuilder(page);
  await page.getByLabel('Workout name').fill('Long Walk');
  await page.getByRole('button', { name: 'Save Workout' }).click();
  // Selecting a custom template attaches it to the selected day; the day card
  // is where you actually start it.
  await page.getByRole('button', { name: 'Long Walk', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  // Nothing to lift, so neither headed section should render an empty shell.
  await expect(page.getByRole('heading', { name: 'Main Workout' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Core Block' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cardio Block' })).toBeVisible();

  // The cardio block is the whole workout, so progress is out of one item.
  await expect(page.getByText('0/1 items')).toBeVisible();

  await page.getByPlaceholder('mm:ss').first().fill('60:00');
  await page.locator('button[aria-label^="Mark cardio"]').click();
  await page.waitForTimeout(2600);

  // Reaching 1/1 fires the celebration dialog, which sits over the page.
  const close = page.getByRole('button', { name: 'Close', exact: true });
  if (await close.count()) await close.click();

  await page.getByRole('button', { name: 'Complete Workout' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await page.waitForTimeout(500);

  const stored = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    const w = list[list.length - 1];
    return { completed: w?.completed, exercises: w?.exercises?.length, abs: w?.abs?.length };
  });
  expect(stored.exercises, 'a cardio-only workout should have no exercises').toBe(0);
  expect(stored.completed, 'a cardio-only workout could not be completed').toBe(true);
});

test('the core block is not called Abs', async ({ page }) => {
  // Renamed when core became its own muscle group and the section stopped
  // being only abs.
  await page.addInitScript(() => localStorage.setItem('ironpath_tour_seen', '1'));
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page.getByRole('heading', { name: 'Core Block' })).toBeVisible();
  await expect(page.getByText('Abs Block')).toHaveCount(0);
});

test('the builder tour says a cardio-only workout is possible', async ({ page }) => {
  // Otherwise it is only discoverable by scrolling past every exercise and
  // noticing Save is enabled with nothing ticked. This step is the right home
  // for it because the tour scrolls to Save as it shows it.
  await page.addInitScript(() => {
    localStorage.setItem('ironpath_tour_seen', '1');
    localStorage.setItem('ironpath_template_tour_seen', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();

  const tour = page.getByTestId('modal-tour');
  await expect(tour).toBeVisible();
  await tour.getByRole('button', { name: 'Next' }).click();
  await tour.getByRole('button', { name: 'Next' }).click();

  await expect(tour.getByRole('heading', { name: 'Name it, then save' })).toBeVisible();
  await expect(tour, 'the tour never mentions cardio-only workouts').toContainText('cardio-only');
});
