import { test, expect, type Page } from '@playwright/test';

/**
 * Swiping the template picker on a phone.
 *
 * Every row has a gear on its right, and the gears run down the side of the
 * screen where a right thumb scrolls. Radix's DropdownMenu opens on
 * `pointerdown`, so a swipe that started on a gear opened that row's menu as
 * soon as the finger landed. The menu's scroll lock then cancelled the swipe.
 * In practice the list would only scroll from the padding at the screen's
 * edge.
 *
 * Playwright's `click` and `tap` cannot reproduce this, because neither one
 * moves the finger. The swipe here is built from raw touch events over CDP, so
 * it goes through the browser's own gesture handling, the same path a finger
 * takes. This requires Chromium, which both projects use.
 */
test.use({ hasTouch: true });

const NAMES = [
  'Shoulders and Biceps', 'Shoulders, Chest, and Forearms', 'Cardio',
  "Casey's Back, Biceps & Legs", 'Triceps and Legs', 'Caseys Legs',
  'Bicep, Shoulders, back', 'Everything',
];

async function openPicker(page: Page) {
  await page.addInitScript(([list]) => {
    localStorage.setItem('ironpath_template_tour_seen', '1');
    localStorage.setItem(
      'ironpath_custom_templates',
      JSON.stringify((list as string[]).map((name, i) => ({
        id: i + 1, name, exercises: [], abs: [],
      }))),
    );
  }, [NAMES]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await expect(page.getByRole('heading', { name: 'Select Workout Template' })).toBeVisible();
}

/** The picker's scroll container, found from its own heading rather than the first dialog. */
function scrollTop(page: Page, value?: number): Promise<number> {
  return page.getByRole('heading', { name: 'Select Workout Template' }).evaluate((h, v) => {
    const scroller = h.closest('[role="dialog"]')!.querySelector(':scope > div') as HTMLElement;
    if (v !== undefined) scroller.scrollTop = v;
    return scroller.scrollTop;
  }, value);
}

/** Put a finger down at the centre of `target` and drag it `dy` pixels. */
async function swipe(page: Page, target: string, dy: number) {
  const box = (await page.getByRole('button', { name: target, exact: true }).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + (dy * i) / 12 }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
}

test('a swipe that starts on a gear scrolls the list instead of opening its menu', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'raw touch input goes through CDP');
  await openPicker(page);

  // Scroll to the bottom first, so the custom workouts are in reach and a
  // downward swipe has somewhere to go.
  const bottom = await scrollTop(page, 1e6);
  expect(bottom, 'the list is too short to scroll, so nothing here is tested').toBeGreaterThan(150);

  // The control case shows the swipe itself scrolls, so if the next one fails,
  // the cause is the gear and not the harness.
  await swipe(page, 'Caseys Legs', 200);
  expect(await scrollTop(page), 'a swipe on the row name did not scroll').toBeLessThan(bottom - 100);

  await scrollTop(page, 1e6);
  await swipe(page, 'Options for Caseys Legs', 200);
  await expect(page.getByRole('menu'), 'the swipe opened the gear menu').toHaveCount(0);
  expect(await scrollTop(page), 'a swipe on the gear did not scroll').toBeLessThan(bottom - 100);
});

test('a tap on a gear still opens its menu', async ({ page }) => {
  await openPicker(page);
  const gear = page.getByRole('button', { name: 'Options for Caseys Legs' });
  await gear.scrollIntoViewIfNeeded();
  await gear.tap();

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Edit workout' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Delete workout' })).toBeVisible();

  await menu.getByRole('menuitem', { name: 'Edit workout' }).tap();
  await expect(page.getByRole('heading', { name: 'Edit Custom Workout' })).toBeVisible();
});
