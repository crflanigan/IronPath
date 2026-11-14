import { test, expect } from '@playwright/test';

/**
 * The drawn exercise images: the ten core-block exercises that had no picture
 * at all, and the extras offered for custom exercises.
 */

const CORE = [
  'Crunch',
  'Cross-Leg Crunch',
  'Jack Knife',
  'Knee Raise',
  'Legs-Up Vertical Crunch',
  'Reverse Crunch',
  'Side Oblique Crunch',
  'Side Oblique Knee Raise',
  'Side Oblique Leg Raise',
  'Straight Leg Thrust',
];

const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

test('every core-block image is served, as a small SVG', async ({ request }) => {
  for (const name of CORE) {
    const response = await request.get(`/exercise-images/${slug(name)}.svg`);
    expect(response.status(), name).toBe(200);
    expect(response.headers()['content-type'], name).toContain('image/svg+xml');
    expect((await response.body()).length, name).toBeLessThan(8 * 1024);
  }
});

test('a core exercise in a workout opens its picture from its name', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem(
      'ironpath_workouts',
      JSON.stringify([
        {
          id: 1,
          date,
          type: 'Core',
          exercises: [],
          abs: [
            { name: 'Jack Knife', reps: 20, completed: false },
            { name: 'Something With No Picture', reps: 10, completed: false },
          ],
          completed: false,
          duration: null,
        },
      ]),
    );
    localStorage.setItem('ironpath_current_id', '2');
  });
  await page.goto('/workout/1');

  // No picture, no affordance.
  await expect(
    page.getByRole('button', { name: 'Show how to do Something With No Picture' }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Show how to do Jack Knife' }).click();
  const image = page.getByRole('img', { name: 'Reference photo for Jack Knife' });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', '/exercise-images/jack-knife.svg');
  // Actually decoded, not a broken-image box.
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);

  // Opening the picture must not have ticked the row it sits on.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Mark Jack Knife complete' })).toBeVisible();
});

test('the photo picker for a custom exercise offers the drawn extras', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  const builder = page.getByTestId('custom-workout-builder');
  await builder.getByRole('button', { name: '+ New exercise' }).click();
  await builder.getByRole('button', { name: 'Choose a photo' }).click();

  for (const name of ['Deadlift', 'Plank', 'Pull Up', 'Kettlebell Swing']) {
    const option = builder.getByRole('button', { name, exact: true });
    await expect(option).toBeVisible();
    await expect
      .poll(() => option.locator('img').evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test('a template row says how many exercises it has, and nothing that gets cut off', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  const row = page.getByRole('button', { name: 'Chest Day', exact: true });
  await expect(row).toContainText(/^Chest Day\d+ exercises$/);
});
