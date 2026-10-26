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

test.describe('with a finger', () => {
  test.use({ hasTouch: true });

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
});

/**
 * The highlight that trailed a swipe.
 *
 * On an iPhone, a finger moving across buttons sets `:hover` on whatever is
 * under it, so every row and gear a swipe crossed lit up with the hover fill.
 * The highlight even ran ahead of the finger onto rows it never touched.
 * Chromium does not do this, so it cannot be swiped into existence here.
 * What can be checked is the half that IronPath controls: a device that cannot
 * hover does not paint a hover style, even when `:hover` is set. That is
 * Tailwind's `hoverOnlyWhenSupported`, and it covers every `hover:` in the app,
 * not only this list.
 */
test('hover styles paint only where there is a mouse to hover with', async ({ page }, testInfo) => {
  await openPicker(page);
  const canHover = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  // Pinned per project, so a change in emulation cannot quietly turn this
  // into two runs of the same branch.
  expect(canHover).toBe(testInfo.project.name === 'chromium');

  for (const name of ['Caseys Legs', 'Options for Caseys Legs']) {
    const button = page.getByRole('button', { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    const resting = await button.evaluate(el => getComputedStyle(el).backgroundColor);
    await button.hover();
    // The state is set either way; only whether it paints may differ.
    await expect.poll(() => button.evaluate(el => el.matches(':hover'))).toBe(true);
    // Past the 150ms colour transition, so a highlight has time to show.
    await page.waitForTimeout(300);
    const hovered = await button.evaluate(el => getComputedStyle(el).backgroundColor);
    if (canHover) {
      expect(hovered, `${name}: a mouse no longer highlights it`).not.toBe(resting);
    } else {
      expect(hovered, `${name}: lit up on a phone`).toBe(resting);
    }
    await page.mouse.move(0, 0);
  }
});
