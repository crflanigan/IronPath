import { test, expect, type Page } from '@playwright/test';

async function startTodaysWorkout(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await page.waitForTimeout(1200);
}

/**
 * The reference-photo button is a 20x20 icon on the screen used one-handed,
 * in a gym, between sets. Its hit area is expanded to 44x44 with an absolutely
 * positioned pseudo-element rather than by growing the button, because growing
 * every undersized control on this page would add ~400px to a page that is
 * already 4472px on an 839px screen.
 *
 * Two things therefore have to hold, and the second is the one that would make
 * this a bad trade:
 *
 *   1. the tap area really is bigger, and the row height really is unchanged
 *   2. the bigger area does not swallow taps meant for the control beside it
 */

test.describe('the reference-photo button', () => {
  test('is tappable well outside the 20px icon, without moving anything', async ({ page }) => {
    await startTodaysWorkout(page);

    const photo = page.getByRole('button', { name: /Show reference photo/ }).first();
    await expect(photo).toBeVisible();

    // The workout page is ~4500px tall, so this button starts below the fold.
    // Without scrolling it into view, boundingBox() gives coordinates outside
    // the viewport and the click lands on nothing — which looks exactly like
    // the hit area not working.
    await photo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);

    const pageHeightBefore = await page.evaluate(() => document.body.scrollHeight);
    const box = (await photo.boundingBox())!;

    // The drawn control is still small — this fix must not change the layout.
    expect(Math.round(box.width)).toBeLessThanOrEqual(24);
    expect(Math.round(box.height)).toBeLessThanOrEqual(24);

    // Tap 16px above the centre. That is outside the icon entirely, and inside
    // the 44px zone (which reaches 22px from the centre).
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 - 16);

    await expect(page.getByRole('dialog')).toBeVisible();

    // Nothing reflowed as a result of the larger target.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(await page.evaluate(() => document.body.scrollHeight)).toBe(pageHeightBefore);
  });

  test('does not steal the tap meant for the control next to it', async ({ page }) => {
    await startTodaysWorkout(page);

    const photo = page.getByRole('button', { name: /Show reference photo/ }).first();
    await photo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const photoBox = (await photo.boundingBox())!;

    // Find the nearest other control and click its centre. If the expanded
    // zone overlapped it, this would open the photo dialog instead.
    const neighbour = await page.evaluate(({ cx, cy }) => {
      const controls = Array.from(document.querySelectorAll('button, input'))
        .map(el => {
          const b = el.getBoundingClientRect();
          return { el, x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height,
                   label: (el.getAttribute('aria-label') || el.textContent || '').trim() };
        })
        .filter(c => c.w > 0 && c.h > 0 && !/Show reference photo/.test(c.label));

      let best = null as null | typeof controls[0];
      let bestD = Infinity;
      for (const c of controls) {
        const d = Math.hypot(c.x - cx, c.y - cy);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best ? { x: best.x, y: best.y, label: best.label, distance: Math.round(bestD) } : null;
    }, { cx: photoBox.x + photoBox.width / 2, cy: photoBox.y + photoBox.height / 2 });

    expect(neighbour, 'no neighbouring control found').not.toBeNull();

    await page.mouse.click(neighbour!.x, neighbour!.y);
    await page.waitForTimeout(300);

    // The photo dialog must not have opened. Whatever the neighbour does is
    // its own business; what matters is that the photo button did not win.
    const dialogs = page.getByRole('dialog').filter({ hasText: /reference|photo/i });
    await expect(dialogs).toHaveCount(0);
  });
});
