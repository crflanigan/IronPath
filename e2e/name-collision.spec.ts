import { test, expect, type Page } from '@playwright/test';

/**
 * Templates are resolved by name, and `workoutTemplates[name]` is consulted
 * first — so a custom workout sharing a built-in workout's name can never be
 * opened. Choosing it hands you the built-in one instead, silently. The
 * builder refuses those names rather than letting one be created.
 */

async function openBuilder(page: Page) {
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  const builder = page.getByTestId('custom-workout-builder');
  await expect(builder).toBeVisible();
  await builder.getByRole('checkbox').first().click();
  return builder;
}

test('a built-in workout name is refused', async ({ page }) => {
  await page.goto('/');
  const builder = await openBuilder(page);

  await builder.getByLabel('Workout name').fill('Chest Day');

  await expect(builder.getByText('is a built-in workout')).toBeVisible();
  await expect(builder.getByRole('button', { name: 'Save Workout' })).toBeDisabled();
});

test('the check ignores case and surrounding spaces', async ({ page }) => {
  await page.goto('/');
  const builder = await openBuilder(page);

  await builder.getByLabel('Workout name').fill('  chest day  ');

  await expect(builder.getByText('is a built-in workout')).toBeVisible();
  await expect(builder.getByRole('button', { name: 'Save Workout' })).toBeDisabled();
});

test('a name of your own is still accepted', async ({ page }) => {
  await page.goto('/');
  const builder = await openBuilder(page);

  await builder.getByLabel('Workout name').fill('Chest Day But Mine');

  await expect(builder.getByText('is a built-in workout')).toHaveCount(0);
  await expect(builder.getByRole('button', { name: 'Save Workout' })).toBeEnabled();

  await builder.getByRole('button', { name: 'Save Workout' }).click();
  await expect(builder).toBeHidden();
  await expect(page.getByRole('button', { name: 'Chest Day But Mine', exact: true })).toBeVisible();
});

test('renaming an existing template to its own name is still allowed', async ({ page }) => {
  await page.goto('/');
  const builder = await openBuilder(page);
  await builder.getByLabel('Workout name').fill('Keeps Its Name');
  await builder.getByRole('button', { name: 'Save Workout' }).click();
  await expect(builder).toBeHidden();

  const row = page.getByRole('button', { name: 'Keeps Its Name', exact: true }).locator('..');
  await row.getByRole('button', { name: /Options for/ }).click();
  await page.getByRole('menuitem', { name: 'Edit workout' }).click();

  const editor = page.getByTestId('custom-workout-builder');
  await expect(editor).toBeVisible();
  // Unchanged name must not be reported as a duplicate of itself.
  await expect(editor.getByText('must be unique')).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Update Workout' })).toBeEnabled();
});
