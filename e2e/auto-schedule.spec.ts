import { test, expect, type Page } from '@playwright/test';

/**
 * The journey that broke: build a custom workout, put it in the auto-schedule
 * rotation, then rename it. The rotation stores workout names, so before the
 * fix the rename silently dropped the workout out of the rotation.
 */

/**
 * Identify the builder by its description rather than its title: the template
 * selector contains a *button* labelled "Create Custom Workout", so filtering
 * dialogs on that phrase matches the selector too once it reopens.
 */
function builderDialog(page: Page) {
  return page.getByTestId('custom-workout-builder');
}

/**
 * Close the workout template selector and wait for it to actually go away.
 * Pressing Escape is not reliable here — on the mobile viewport the key can
 * land while focus is still inside a just-closed dropdown, leaving the dialog
 * open and everything behind it unclickable.
 */
async function closeTemplateSelector(page: Page) {
  const selector = page.getByRole('dialog').filter({ hasText: 'Select Workout Template' });
  await expect(selector).toBeVisible();
  await selector.getByRole('button', { name: 'Close' }).click();
  await expect(selector).toBeHidden();
}

async function createCustomWorkout(page: Page, name: string) {
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();

  const builder = builderDialog(page);
  await expect(builder).toBeVisible();

  // Any exercise will do — the first checkbox in the dialog is an exercise.
  await builder.getByRole('checkbox').first().click();
  await builder.getByPlaceholder('Workout name').fill(name);
  await builder
    .locator('label')
    .filter({ hasText: 'Include in auto-schedule' })
    .getByRole('checkbox')
    .click();

  await builder.getByRole('button', { name: 'Save Workout' }).click();
  await expect(builder).toBeHidden();
}

async function renameCustomWorkout(page: Page, from: string, to: string) {
  const row = page.getByRole('button', { name: from, exact: true }).locator('..');
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'Edit workout' }).click();

  const builder = builderDialog(page);
  await expect(builder).toBeVisible();
  await expect(builder.getByText('Edit Custom Workout')).toBeVisible();
  await builder.getByPlaceholder('Workout name').fill(to);
  await builder.getByRole('button', { name: 'Update Workout' }).click();
  await expect(builder).toBeHidden();
}

/**
 * Persist an explicit rotation by opening the auto-schedule editor and saving
 * it. Until the user does this, the rotation is derived from each template's
 * "include in auto-schedule" flag rather than stored by name — and it is the
 * stored-by-name state that the rename bug corrupts.
 */
async function persistAutoSchedule(page: Page) {
  await page.getByRole('button', { name: 'Customize Auto-Schedule' }).click();
  const schedule = page.getByRole('dialog').filter({ hasText: 'Customize Auto-Schedule' });
  await expect(schedule).toBeVisible();
  await schedule.getByRole('button', { name: 'Save' }).click();
  await expect(schedule).toBeHidden();
}

test('renaming a scheduled custom workout keeps it in the rotation', async ({ page }) => {
  await page.goto('/');

  await createCustomWorkout(page, 'E2E Original');
  await closeTemplateSelector(page);
  await persistAutoSchedule(page);

  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await renameCustomWorkout(page, 'E2E Original', 'E2E Renamed');
  await closeTemplateSelector(page);

  await page.getByRole('button', { name: 'Customize Auto-Schedule' }).click();
  const schedule = page.getByRole('dialog').filter({ hasText: 'Customize Auto-Schedule' });
  await expect(schedule).toBeVisible();

  const renamed = schedule.locator('label').filter({ hasText: 'E2E Renamed' });
  await expect(renamed).toBeVisible();
  await expect(renamed.getByRole('checkbox')).toBeChecked();
  await expect(schedule.locator('label').filter({ hasText: 'E2E Original' })).toHaveCount(0);
});

test('the stored rotation holds the new name, not the old one', async ({ page }) => {
  await page.goto('/');
  await createCustomWorkout(page, 'E2E Original');
  await closeTemplateSelector(page);

  // The rotation is only persisted by name once the user saves an explicit
  // selection — until then the builder's "include in auto-schedule" flag is
  // what drives it. This is the state the rename bug actually affects.
  await page.getByRole('button', { name: 'Customize Auto-Schedule' }).click();
  const schedule = page.getByRole('dialog').filter({ hasText: 'Customize Auto-Schedule' });
  await schedule.getByRole('button', { name: 'Save' }).click();
  await expect(schedule).toBeHidden();

  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_auto_schedule_workouts') ?? '[]'),
  );
  expect(before).toContain('E2E Original');

  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await renameCustomWorkout(page, 'E2E Original', 'E2E Renamed');

  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_auto_schedule_workouts') ?? '[]'),
  );
  expect(after).toContain('E2E Renamed');
  expect(after).not.toContain('E2E Original');
});

test('deleting the only scheduled workout leaves the calendar usable', async ({ page }) => {
  await page.goto('/');
  await createCustomWorkout(page, 'E2E Doomed');

  // Narrow the rotation to just this one template, then delete it.
  await page.evaluate(() =>
    localStorage.setItem('ironpath_auto_schedule_workouts', JSON.stringify(['E2E Doomed'])),
  );

  const row = page.getByRole('button', { name: 'E2E Doomed', exact: true }).locator('..');
  await row.getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'Delete workout' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('button', { name: 'E2E Doomed', exact: true })).toHaveCount(0);

  // The deleted template must not linger in the rotation. Left behind, it was
  // the only selection, so the cycle resolved to nothing and every day on the
  // calendar was stamped with an undefined workout type.
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_auto_schedule_workouts') ?? '[]'),
  );
  expect(stored).not.toContain('E2E Doomed');
});
