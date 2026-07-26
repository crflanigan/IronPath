import { test, expect, type Page } from '@playwright/test';

/**
 * Adding your own exercises. The built-in library is a gym-circuit list —
 * 43 machine entries against 16 free-weight — so the gaps are things like
 * deadlifts and bear crawls.
 */

function builder(page: Page) {
  return page.getByRole('dialog').filter({ hasText: 'Select up to 15 exercises' });
}

async function openBuilder(page: Page) {
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  await expect(builder(page)).toBeVisible();
  return builder(page);
}

async function addExercise(
  page: Page,
  name: string,
  block: 'Main workout' | 'Warm-up' = 'Main workout',
) {
  const panel = builder(page);
  await panel.getByRole('button', { name: '+ New exercise' }).click();
  await panel.getByLabel('Exercise name').fill(name);
  await panel.getByRole('button', { name: block }).click();
  await panel.getByRole('button', { name: 'Add exercise' }).click();
}

test('a main exercise can be added and used', async ({ page }) => {
  await page.goto('/');
  const panel = await openBuilder(page);

  await addExercise(page, 'Deadlift');

  // Added exercises are ticked straight away — you added it to use it.
  await expect(panel.getByRole('checkbox', { name: 'Deadlift' })).toBeChecked();

  await panel.getByLabel('Workout name').fill('Pull Day');
  await panel.getByRole('button', { name: 'Save Workout' }).click();
  await expect(panel).toBeHidden();

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_custom_templates') ?? '[]'),
  );
  expect(stored[0].exercises.map((e: { machine: string }) => e.machine)).toContain('Deadlift');
});

test('a warm-up exercise joins the core block instead', async ({ page }) => {
  await page.goto('/');
  const panel = await openBuilder(page);

  await addExercise(page, 'Bear Crawl', 'Warm-up');

  await expect(panel.getByRole('checkbox', { name: 'Bear Crawl' })).toBeChecked();

  await panel.getByRole('checkbox').first().click();
  await panel.getByLabel('Workout name').fill('Crawl Day');
  await panel.getByRole('button', { name: 'Save Workout' }).click();
  await expect(panel).toBeHidden();

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_custom_templates') ?? '[]'),
  );
  // Recorded as a core entry, which carries no weight at all.
  expect(stored[0].abs.map((a: { name: string }) => a.name)).toContain('Bear Crawl');
  expect(JSON.stringify(stored[0].abs)).not.toContain('weight');
});

test('it survives a reload', async ({ page }) => {
  await page.goto('/');
  await openBuilder(page);
  await addExercise(page, 'Deadlift');

  await page.reload();
  const panel = await openBuilder(page);

  await expect(panel.getByRole('checkbox', { name: 'Deadlift' })).toBeVisible();
});

test('a duplicate name is refused', async ({ page }) => {
  await page.goto('/');
  const panel = await openBuilder(page);

  await panel.getByRole('button', { name: '+ New exercise' }).click();
  await panel.getByLabel('Exercise name').fill('Seated Row');

  await expect(panel.getByText('already exists')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Add exercise' })).toBeDisabled();
});

test('an exercise with no photo is not tappable, one with a photo still is', async ({ page }) => {
  await page.goto('/');
  const panel = await openBuilder(page);
  await addExercise(page, 'Deadlift');

  // No photo ships for a deadlift, so there is nothing to preview.
  await expect(panel.getByRole('button', { name: 'Deadlift', exact: true })).toHaveCount(0);
  await expect(panel.getByText('Deadlift', { exact: true })).toBeVisible();

  // A built-in that does have one keeps working exactly as before.
  await panel.getByRole('button', { name: 'Seated Row', exact: true }).click();
  await expect(page.getByRole('dialog').filter({ hasText: 'Seated Row' })).toBeVisible();
});

test('an added exercise can be removed again', async ({ page }) => {
  await page.goto('/');
  const panel = await openBuilder(page);
  await addExercise(page, 'Deadlift');

  await panel.getByRole('button', { name: 'Remove Deadlift' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();

  await expect(panel.getByRole('checkbox', { name: 'Deadlift' })).toHaveCount(0);
});

test('removing one does not strip it from a template that already uses it', async ({ page }) => {
  await page.goto('/');
  const panel = await openBuilder(page);
  await addExercise(page, 'Deadlift');
  await panel.getByLabel('Workout name').fill('Pull Day');
  await panel.getByRole('button', { name: 'Save Workout' }).click();
  await expect(panel).toBeHidden();

  // Saving returns to the template selector, so reopen the builder from there
  // rather than from the calendar behind it.
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  await expect(builder(page)).toBeVisible();
  await builder(page).getByRole('button', { name: 'Remove Deadlift' }).click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await builder(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(builder(page)).toBeHidden();

  const row = page.getByRole('button', { name: 'Pull Day', exact: true }).locator('..');
  await row.getByRole('button', { name: /Options for/ }).click();
  await page.getByRole('menuitem', { name: 'Edit workout' }).click();
  await expect(builder(page)).toBeVisible();
  await builder(page).getByRole('button', { name: 'Update Workout' }).click();

  // The save path used to look each selected exercise up in the library and
  // silently drop anything missing.
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ironpath_custom_templates') ?? '[]'),
  );
  expect(stored[0].exercises.map((e: { machine: string }) => e.machine)).toContain('Deadlift');
});
