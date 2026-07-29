import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * The equipment filter toggle was awkward to get right across screen sizes, so
 * anything added to its row has to leave it exactly where it was.
 *
 * Measurements have to wait for the dialog's open animation to finish. It
 * scales in from 95%, so sampling too early reports a box up to a pixel narrow
 * and several pixels off vertically — enough noise to hide a real regression
 * and to invent ones that are not there.
 */
const WIDTHS = [320, 375, 414, 768, 1280];

async function settledBox(locator: Locator) {
  let previous = await locator.boundingBox();
  for (let attempt = 0; attempt < 25; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 60));
    const current = await locator.boundingBox();
    if (
      previous &&
      current &&
      Math.abs(previous.width - current.width) < 0.01 &&
      Math.abs(previous.y - current.y) < 0.01
    ) {
      return current;
    }
    previous = current;
  }
  throw new Error('element never settled');
}

async function openBuilder(page: Page) {
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  await expect(page.getByTestId('custom-workout-builder')).toBeVisible();
}

for (const width of WIDTHS) {
  test(`the filter toggle keeps its place at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await openBuilder(page);

    const toggle = page.locator('button:has(> span.text-2xl)').first();
    const addButton = page.getByRole('button', { name: '+ New exercise' });
    const box = await settledBox(toggle);
    const addBox = await settledBox(addButton);
    const row = (await toggle.locator('..').boundingBox())!;

    // Still its own fixed size, not squeezed by the new neighbour.
    expect(box.width).toBeGreaterThan(76);
    expect(box.width).toBeLessThan(82);

    // Still flush with the right-hand end of its row.
    expect(Math.abs(row.x + row.width - (box.x + box.width))).toBeLessThan(1);

    // Still on one line: the row must not wrap at any width, and the new
    // button sits to its left rather than displacing it.
    expect(Math.abs(addBox.y - box.y)).toBeLessThan(box.height);
    expect(addBox.x).toBeLessThan(box.x);

    // Nothing on the row may overflow it. This is the assertion that actually
    // bites: a neighbour too wide to shrink pushes the row past the dialog,
    // which widens the content box, re-wraps the text above and shifts the
    // toggle vertically — while its own size and right-alignment still look
    // perfectly correct in isolation.
    const rowOverflow = await toggle
      .locator('..')
      .evaluate(el => el.scrollWidth - el.clientWidth);
    expect(rowOverflow).toBeLessThanOrEqual(1);

    const dialogOverflow = await page
      .getByRole('dialog')
      .first()
      .evaluate(el => el.scrollWidth - el.clientWidth);
    expect(dialogOverflow).toBeLessThanOrEqual(1);

    console.log(
      `GEOM ${width} w=${box.width.toFixed(2)} h=${box.height.toFixed(2)} ` +
        `top=${box.y.toFixed(1)} rightAlign=${(row.x + row.width - (box.x + box.width)).toFixed(2)}`,
    );
  });
}
