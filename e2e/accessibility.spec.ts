import { test, expect, type Page } from '@playwright/test';

/**
 * Every interactive control must expose a name to assistive technology.
 *
 * An icon-only button with no `aria-label` is announced as just "button", and
 * a Radix checkbox renders as a `<button>` — so wrapping it in a `<label>`
 * does not name it either, which is how a whole screen of exercise
 * checkboxes ended up anonymous.
 *
 * The rule is enforced per screen rather than per component, because the
 * failure is only visible once a control is rendered in place.
 */

/** Controls whose accessible name is missing, or is nothing but an emoji. */
async function unnamedControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const offenders: string[] = [];
    document
      .querySelectorAll('button, [role="checkbox"], input:not([type="file"])')
      .forEach(element => {
        const el = element as HTMLElement;
        if (el.offsetParent === null) return; // not rendered
        const name = el.getAttribute('aria-label') || (el.textContent || '').trim();
        if (name && /[a-zA-Z0-9]/.test(name)) return;
        offenders.push(el.outerHTML.replace(/\s+/g, ' ').slice(0, 120));
      });
    return offenders;
  });
}

test('the calendar names every control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'IronPath' })).toBeVisible();
  expect(await unnamedControls(page)).toEqual([]);
});

test('the auto-schedule editor names every control', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Customize Auto-Schedule' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await unnamedControls(page)).toEqual([]);
});

test('the streak editor names every control', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Day Streak/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await unnamedControls(page)).toEqual([]);
});

test('the template selector names every control', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await unnamedControls(page)).toEqual([]);
});

test('the custom workout builder names every control', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create or Edit Custom Workout' }).click();
  await page.getByRole('button', { name: 'Create Custom Workout' }).first().click();
  await expect(page.getByText('Select up to 15 exercises')).toBeVisible();
  expect(await unnamedControls(page)).toEqual([]);
});

test('the workout page names every control', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await expect(page.getByText('Main Workout')).toBeVisible();
  expect(await unnamedControls(page)).toEqual([]);
});

test('set inputs are distinguishable from each other', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);

  // Previously only the weight field carried a label, so reps and rest were
  // announced identically to every other unlabelled box on the page.
  await expect(page.getByLabel('Weight, set 1').first()).toBeVisible();
  await expect(page.getByLabel('Reps, set 1').first()).toBeVisible();
  await expect(page.getByLabel('Rest, set 1').first()).toBeVisible();
});
