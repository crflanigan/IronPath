import { test, expect, type Page } from '@playwright/test';

/**
 * The first-run tour and the install prompt.
 *
 * Every other spec runs with `ironpath_tour_seen` pre-set by the Playwright
 * config, because the tour is a full-screen overlay that would otherwise
 * intercept the first click of every test. This file is the exception: it
 * clears that flag and exercises the path a genuinely new visitor takes.
 *
 * The load-bearing one is "leaves the page usable after it closes". A tour
 * that traps someone in an overlay, or that leaves the page padded after it
 * closes, is worse than no tour at all — this app gets used mid-workout.
 */

/**
 * Start as someone who has never opened the app, and land on the page.
 *
 * Deliberately not `addInitScript`: that re-runs on *every* navigation, so a
 * later reload would wipe the very flag under test and the tour would appear
 * to come back. Clearing once and reloading gives a genuinely fresh visitor
 * whose subsequent navigations behave normally.
 */
async function asNewVisitor(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* private mode */
    }
  });
  await page.reload();
}

test.describe('the first-run tour', () => {
  test('greets a new visitor and walks every step', async ({ page }) => {
    await asNewVisitor(page);

    const tour = page.getByTestId('app-tour');
    await expect(tour).toBeVisible();
    await expect(tour.getByText('Step 1 of 4')).toBeVisible();
    await expect(tour.getByRole('heading', { name: 'Your month at a glance' })).toBeVisible();

    // Scoped to the tour: a bare "Next" also matches the calendar's
    // "Next month" button.
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading', { name: 'Build your own' })).toBeVisible();

    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading', { name: 'Keep a backup' })).toBeVisible();

    // The step that exists because most users have no backup and no way back.
    await expect(tour).toContainText('only on this device');

    // And the one that exists because "why isn't this in the app store" is
    // the question its author keeps having to answer in person.
    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading', { name: 'Keep it on your home screen' })).toBeVisible();
    await expect(tour).toContainText('not in an app store');
    await expect(tour).toContainText(/Add to Home [Ss]creen|Install app|Install IronPath/);

    await tour.getByRole('button', { name: 'Got it' }).click();
    await expect(tour).toHaveCount(0);
  });

  test('drops the install step when already installed', async ({ page }) => {
    await asNewVisitor(page);
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        q.includes('display-mode: standalone')
          ? ({
              matches: true, media: q, onchange: null,
              addEventListener() {}, removeEventListener() {},
              addListener() {}, removeListener() {},
              dispatchEvent: () => false,
            } as unknown as MediaQueryList)
          : real(q);
    });
    await page.reload();

    // Telling someone who already installed it how to install it is noise.
    await expect(page.getByTestId('app-tour').getByText('Step 1 of 3')).toBeVisible();
  });

  test('keeps every highlight clear of its own panel', async ({ page }) => {
    await asNewVisitor(page);

    const tour = page.getByTestId('app-tour');
    const halo = tour.locator('div[style*="box-shadow"]').first();
    const panel = page.getByTestId('app-tour-panel');

    // Step two shipped broken the first time: the halo was drawn, and moved,
    // and was completely invisible because it sat underneath the panel. An
    // earlier version of this test only checked that the halo *moved* between
    // steps, which the broken code also did — so it caught nothing. What
    // matters is that the highlight is somewhere a person can actually see.
    // Only the first three steps point at something; the install step
    // deliberately has no target and dims the whole screen instead.
    for (let step = 1; step <= 3; step++) {
      await expect(halo).toBeVisible();
      await page.waitForTimeout(700); // smooth-scroll settle

      const h = await halo.boundingBox();
      const p = await panel.boundingBox();
      expect(h, `step ${step}: no halo`).not.toBeNull();
      expect(p, `step ${step}: no panel`).not.toBeNull();

      expect(
        h!.y + h!.height,
        `step ${step}: highlight is hidden behind the tour panel`,
      ).toBeLessThanOrEqual(p!.y + 1);

      expect(h!.y, `step ${step}: highlight is above the viewport`)
        .toBeGreaterThanOrEqual(-1);

      if (step < 3) {
        await tour.getByRole('button', { name: 'Next' }).click();
      }
    }
  });

  test('puts the page back where it found it, whenever you leave', async ({ page }) => {
    // Reported from real use: dismissing part-way through left the header
    // scrolled off the top with dead space below. The tour scrolls to bring
    // each target clear of its panel and used to abandon the page there,
    // while the body padding lifting on unmount shrank the content underneath.
    for (const stepsToAdvance of [0, 1, 2]) {
      await asNewVisitor(page);
      const tour = page.getByTestId('app-tour');

      for (let i = 0; i < stepsToAdvance; i++) {
        await tour.getByRole('button', { name: 'Next' }).click();
        await page.waitForTimeout(700);
      }
      await tour.getByRole('button', { name: 'Skip' }).click();
      await expect(tour).toHaveCount(0);
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => ({
        scrollY: Math.round(window.scrollY),
        headerBottom:
          document.querySelector('header')?.getBoundingClientRect().bottom ?? -1,
        padding: document.body.style.paddingBottom,
      }));

      expect(state.scrollY, `dismissed after ${stepsToAdvance} steps`).toBe(0);
      expect(
        state.headerBottom,
        `header scrolled off after dismissing at step ${stepsToAdvance + 1}`,
      ).toBeGreaterThan(0);
      expect(state.padding === '' || state.padding === '0px').toBe(true);
    }
  });

  test('does not come back on the next visit', async ({ page }) => {
    await asNewVisitor(page);
    await page.getByTestId('app-tour').getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('app-tour')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();
    await expect(page.getByTestId('app-tour')).toHaveCount(0);
  });

  test('Settings explains installing, permanently', async ({ page }) => {
    // The durable answer, for someone who skipped the tour or is asked by a
    // friend a week later. The tour is seen once; this never goes away.
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Install IronPath', { exact: true })).toBeVisible();
    await expect(dialog).toContainText(/Add to Home [Ss]creen|Install app/);
  });

  test('can be replayed from Settings', async ({ page }) => {
    // Starts as a returning user, per the config default.
    await page.goto('/');
    await expect(page.getByTestId('app-tour')).toHaveCount(0);

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Replay welcome tour' }).click();

    await expect(page.getByTestId('app-tour')).toBeVisible();
  });

  test('leaves the page usable after it closes', async ({ page }) => {
    await asNewVisitor(page);

    const tour = page.getByTestId('app-tour');
    await tour.getByRole('button', { name: 'Skip' }).click();
    await expect(tour).toHaveCount(0);

    // The tour pads the body so it can scroll a target clear of its own
    // panel. Failing to undo that would leave dead space below the app
    // forever, on a page nobody would think to blame the tour for.
    const padding = await page.evaluate(() => document.body.style.paddingBottom);
    expect(padding === '' || padding === '0px').toBe(true);

    // And the app still works.
    await page.getByRole('button', { name: "Start Today's Workout" }).click();
    await expect(page).toHaveURL(/\/workout\/\d+$/);
    await expect(page.getByLabel('Weight').first()).toBeVisible();
  });
});

test.describe('the install prompt', () => {
  test('stays quiet on a first visit', async ({ page }) => {
    await asNewVisitor(page);

    // Asking someone to install before they have used anything converts
    // badly, so this waits for a second visit even once the tour is done.
    await page.getByTestId('app-tour').getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('install-prompt')).toHaveCount(0);
  });

  test('never appears when the app is already installed', async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        q.includes('display-mode: standalone')
          ? ({
              matches: true,
              media: q,
              onchange: null,
              addEventListener() {},
              removeEventListener() {},
              addListener() {},
              removeListener() {},
              dispatchEvent: () => false,
            } as unknown as MediaQueryList)
          : real(q);
      localStorage.setItem('ironpath_visits', '9');
    });

    await page.goto('/');
    await page.goto('/');
    await expect(page.getByTestId('install-prompt')).toHaveCount(0);
  });
});

/**
 * iOS install copy.
 *
 * The instructions used to name Safari for every iOS visitor, including
 * someone reading them in Chrome — an instruction you cannot follow without
 * leaving the page first. Both user agents below contain the token `Safari`,
 * which is why detection has to rule out the alternatives before concluding
 * Safari rather than the other way round.
 */
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1';

async function openInstallSection(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  return page.getByRole('dialog');
}

test.describe('install instructions on iOS Safari', () => {
  test.use({ userAgent: IOS_SAFARI });

  test('point at the toolbar, and offer no detour', async ({ page }) => {
    const dialog = await openInstallSection(page);

    await expect(dialog).toContainText('Add to Home Screen');
    await expect(dialog).toContainText('in the toolbar');
    // Already in Safari — sending them to Safari would be nonsense.
    await expect(dialog).not.toContainText('Open ironpath.app in Safari');
  });
});

test.describe('install instructions on iOS Chrome', () => {
  test.use({ userAgent: IOS_CHROME });

  test('describe the browser in hand, with Safari only as a fallback', async ({ page }) => {
    const dialog = await openInstallSection(page);

    await expect(dialog).toContainText('in this browser');
    await expect(dialog).toContainText('Add to Home Screen');

    // The actual complaint: being told to use Safari while holding Chrome.
    await expect(dialog).not.toContainText("in Safari's toolbar");
    await expect(dialog).not.toContainText('in Safari’s toolbar');

    // Safari is still mentioned, but as the fallback rather than the first move.
    await expect(dialog).toContainText('No Add to Home Screen in that menu?');
  });
});
