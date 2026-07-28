import { test, expect, type Page } from '@playwright/test';

/**
 * The custom workout builder's own tour.
 *
 * Deliberately separate from the welcome tour rather than four more steps
 * bolted onto it: tours are abandoned in proportion to their length, and
 * someone who bails partway through a six-step welcome would miss the backup
 * warning, which is the step that prevents real data loss.
 *
 * The builder is a dialog with its own `overflow-y-auto`, so the element that
 * scrolls is the dialog, not the window. A highlight that assumed the window
 * would sit on an off-screen target.
 */

async function openBuilder(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  // The picker now has a one-step tour of its own; get past it first.
  const picker = page.getByTestId('modal-tour');
  if (await picker.count()) {
    await picker.getByRole('button', { name: 'Got it' }).click();
  }
  // `.first()` because the gear beside the row carries the same accessible
  // name — the collision every spec that opens this modal has to handle.
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
}

test('the picker explains itself before the builder is even open', async ({ page }) => {
  // The tour used to start one screen later — past the button the person had
  // just pressed, on a screen nothing had explained.
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();

  const tour = page.getByTestId('modal-tour');
  await expect(tour).toBeVisible();
  await expect(tour.getByRole('heading', { name: 'Start from a preset, or from scratch' })).toBeVisible();
  // A single step should not be labelled "Step 1 of 1".
  await expect(tour.getByText(/^Step \d+ of \d+$/)).toHaveCount(0);

  await expect(page.locator('[data-tour-active="true"]')).toHaveAttribute(
    'data-builder-tour',
    'create-custom',
  );

  await tour.getByRole('button', { name: 'Got it' }).click();
  await expect(tour).toHaveCount(0);

  // And it does not come back.
  await page.reload();
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await expect(page.getByTestId('modal-tour')).toHaveCount(0);
});

test.describe('the builder tour', () => {
  test('greets a first-time builder and walks three steps', async ({ page }) => {
    await openBuilder(page);

    const tour = page.getByTestId('modal-tour');
    await expect(tour).toBeVisible();
    await expect(tour.getByText('Step 1 of 3')).toBeVisible();
    await expect(tour.getByRole('heading', { name: 'Pick your exercises' })).toBeVisible();

    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading', { name: 'Not in the list?' })).toBeVisible();

    await tour.getByRole('button', { name: 'Next' }).click();
    await expect(tour.getByRole('heading', { name: 'Name it, then save' })).toBeVisible();

    await tour.getByRole('button', { name: 'Got it' }).click();
    await expect(tour).toHaveCount(0);
  });

  test('each step outlines exactly one target, and you can see it', async ({ page }) => {
    await openBuilder(page);

    const panel = page.getByTestId('app-tour-panel');
    const targets = ['exercise-row', 'new-exercise', 'name-and-save'];

    // The failure worth guarding is not "no outline" but "an outline nobody
    // can see" — behind the panel, or scrolled out of the dialog. Both look
    // to a user like the step did nothing at all.
    for (let step = 1; step <= 3; step++) {
      await page.waitForTimeout(400);

      const active = page.locator('[data-tour-active="true"]');
      await expect(active, `step ${step}: no target outlined`).toHaveCount(1);
      await expect(active).toHaveAttribute('data-builder-tour', targets[step - 1]);

      const t = await active.boundingBox();
      const p = await panel.boundingBox();
      expect(t, `step ${step}: outlined target has no box`).not.toBeNull();

      // "Entirely clear of the panel" is not achievable for every target: the
      // name-and-save block is 132px tall against a ~500px strip, and the
      // first exercise row is only 20px. So the bar is proportional — a short
      // target must be fully visible, a tall one must show a useful chunk.
      const visibleTop = Math.max(t!.y, 0);
      const visibleBottom = Math.min(t!.y + t!.height, p!.y);
      const visible = visibleBottom - visibleTop;
      const required = Math.min(t!.height, 40);
      expect(
        visible,
        `step ${step}: ${Math.round(visible)}px of a ${Math.round(t!.height)}px target visible, needed ${Math.round(required)}`,
      ).toBeGreaterThanOrEqual(required);

      if (step < 3) {
        await page.getByTestId('modal-tour').getByRole('button', { name: 'Next' }).click();
      }
    }
  });

  test('no element is left outlined once the tour closes', async ({ page }) => {
    await openBuilder(page);
    await page.getByTestId('modal-tour').getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('modal-tour')).toHaveCount(0);
    await expect(page.locator('[data-tour-active="true"]')).toHaveCount(0);
  });

  test('does not reappear the next time the builder is opened', async ({ page }) => {
    await openBuilder(page);
    await page.getByTestId('modal-tour').getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('modal-tour')).toHaveCount(0);

    await page.reload();
    await openBuilder(page);
    await expect(page.getByTestId('modal-tour')).toHaveCount(0);
  });

  test('leaves the builder usable', async ({ page }) => {
    await openBuilder(page);
    const tour = page.getByTestId('modal-tour');

    // Walk to the last step, which scrolls the dialog to the very bottom.
    await tour.getByRole('button', { name: 'Next' }).click();
    await tour.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(400);
    await tour.getByRole('button', { name: 'Got it' }).click();
    await expect(tour).toHaveCount(0);
    await page.waitForTimeout(300);

    // The builder still works.
    await expect(page.getByRole('button', { name: '+ New exercise' })).toBeVisible();
    await page.getByRole('button', { name: '+ New exercise' }).click();
    await expect(page.getByLabel('Workout name')).toBeVisible();
  });

  test('Escape closes the tour without closing the builder', async ({ page }) => {
    /*
     * Characterisation only — this does NOT guard the stopPropagation in
     * BuilderTour. Removing that call leaves this test green, twice checked,
     * with and without a settle delay before the key press. A hand probe did
     * show the builder losing its name field without it, so the call is doing
     * something, but I could not turn that into an assertion that fails. It is
     * recorded here rather than dressed up as coverage it does not provide.
     */
    await openBuilder(page);
    await expect(page.getByTestId('modal-tour')).toBeVisible();
    // Let focus settle. Pressing immediately, Radix does not act on the key
    // at all and the test passes whether or not the tour swallows it — which
    // is to say it proves nothing without this wait.
    await page.waitForTimeout(600);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('modal-tour')).toHaveCount(0);
    // The builder itself must survive. Radix closes a dialog on Escape, so
    // without the tour swallowing the key, dismissing the tour would throw
    // away the half-built workout underneath it.
    await expect(page.getByLabel('Workout name')).toBeVisible();
  });
});
