import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * No login means no server copy, so the phone holds the only one. These drive
 * the pieces that make that survivable, in the real built app: being told when
 * a backup is due, seeing the state of it, and a restore that cannot quietly
 * cost you data.
 */

function storedWorkout(id: number, withEquipment = true) {
  const day = String(id).padStart(2, '0');
  return {
    id,
    date: `2026-01-${day}`,
    type: 'Chest Day',
    exercises: [
      {
        machine: 'Seated Chest Press',
        ...(withEquipment ? { equipment: 'machine' } : {}),
        region: 'Chest',
        feel: 'Medium',
        sets: [{ weight: 135, reps: 10, rest: '1:00', completed: true }],
        completed: true,
      },
    ],
    abs: [],
    completed: true,
    duration: 45,
    createdAt: `2026-01-${day}T12:00:00.000Z`,
    updatedAt: `2026-01-${day}T12:00:00.000Z`,
  };
}

async function seed(page: Page, count: number) {
  await page.goto('/');
  await page.evaluate(
    ({ workouts }) => {
      localStorage.setItem('ironpath_workouts', JSON.stringify(workouts));
      localStorage.setItem('ironpath_current_id', String(workouts.length + 1));
    },
    { workouts: Array.from({ length: count }, (_, i) => storedWorkout(i + 1)) },
  );
  await page.reload();
}

test('nobody is nagged before there is anything to lose', async ({ page }) => {
  await seed(page, 9);
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('backup-reminder')).toHaveCount(0);
});

test('ten unprotected workouts raise the reminder, and one tap settles it', async ({ page }) => {
  await seed(page, 10);

  const reminder = page.getByTestId('backup-reminder');
  await expect(reminder).toContainText('10 workouts live only on this device');
  await expect(reminder).toContainText('You have never saved a backup.');

  const download = page.waitForEvent('download');
  await reminder.getByRole('button', { name: 'Back up now' }).click();
  const file = await download;
  expect(JSON.parse(readFileSync((await file.path())!, 'utf8')).workouts).toHaveLength(10);

  await expect(reminder).toHaveCount(0);

  // It stays settled across a reload, and Settings says why.
  await page.reload();
  await expect(reminder).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('backup-status')).toHaveText('Last backup: today');
});

test('"Later" dismisses it without claiming a backup exists', async ({ page }) => {
  await seed(page, 12);

  await page.getByTestId('backup-reminder').getByRole('button', { name: 'Later' }).click();
  await expect(page.getByTestId('backup-reminder')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('backup-reminder')).toHaveCount(0);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('backup-status')).toHaveText(
    'Never backed up · 12 workouts only on this device',
  );
});

test('restoring over newer training says what is about to be replaced', async ({ page }) => {
  await seed(page, 4);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'old.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ workouts: [storedWorkout(1)], preferences: {} })),
  });

  await expect(page.getByRole('alertdialog')).toContainText(
    'This device has 4 completed workouts, 4 of them not in any backup.',
  );
});

test('a backup from before `equipment` existed restores instead of being refused', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        workouts: [storedWorkout(1, false), storedWorkout(2, false)],
        preferences: {},
      }),
    ),
  });
  await page.getByRole('button', { name: 'Restore', exact: true }).click();

  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]').length),
    )
    .toBe(2);
  await page.goto('/history');
  // The seeded workouts are from January, outside the default month view, so
  // look for the lift they logged rather than the workouts themselves.
  await expect(page.getByText('Seated Chest Press').first()).toBeVisible();
});

test.describe('on an iPhone, in the browser', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
  });

  test('the install steps say how to bring existing workouts along', async ({ page }) => {
    await seed(page, 3);
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByTestId('install-carry-over').first()).toContainText(
      'the home-screen app starts empty',
    );
  });

  test('and say nothing of the sort to someone with no workouts', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Add to Home Screen').first()).toBeVisible();
    await expect(page.getByTestId('install-carry-over')).toHaveCount(0);
  });
});
