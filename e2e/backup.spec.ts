import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { setNumericValue } from './helpers';

/**
 * The whole point of a backup is the round trip, so this exercises it end to
 * end in a browser: log something, export the file, wipe the device, restore
 * from that exact file, and check what comes back.
 */

test('a backup exports and restores through the UI', async ({ page }) => {
  await page.goto('/');

  // Something identifiable to look for after the restore.
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await setNumericValue(page.getByLabel('Weight').first(), '173');
  await page.getByRole('button', { name: 'Save Workout' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (localStorage.getItem('ironpath_workouts') ?? '').includes('"weight":173'),
      ),
    )
    .toBe(true);

  await page.getByRole('button', { name: 'Calendar' }).click();

  // Export, and keep the bytes the browser actually wrote.
  await page.getByRole('button', { name: 'Settings' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ironpath-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const backupJson = readFileSync((await download.path())!, 'utf8');

  // The backup must be self-sufficient, so wipe everything.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('No custom workout scheduled for this date')).toBeVisible();

  // Restore from the exported file.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'ironpath-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backupJson),
  });

  await expect(page.getByText('Restore this backup?')).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();

  // The app reloads itself after a successful restore, and today's workout is
  // back on the calendar.
  await expect(page.getByText('No custom workout scheduled for this date')).toHaveCount(0);

  const restoredWeight = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    return stored[0]?.exercises?.[0]?.sets?.[0]?.weight;
  });
  expect(restoredWeight).toBe(173);
});

test('a file that is not a backup is refused without touching anything', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.getByRole('button', { name: 'Calendar' }).click();
  await expect(page.getByRole('button', { name: /Completed/ })).toBeVisible();

  const before = await page.evaluate(() => localStorage.getItem('ironpath_workouts'));

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'holiday-photo.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('definitely not json'),
  });

  await expect(page.getByText("Couldn't read that file")).toBeVisible();
  // No confirmation offered, and nothing replaced.
  await expect(page.getByText('Restore this backup?')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ironpath_workouts'))).toBe(before);
});
