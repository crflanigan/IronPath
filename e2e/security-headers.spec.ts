import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * The security headers, and proof the app still runs under them.
 *
 * Netlify applies `_headers` in production; `vite preview` does not. So a CSP
 * can look perfectly reasonable in review, ship, and break the live app while
 * every local test stays green. These tests inject the real header values from
 * the real file and drive the app under them.
 */
function headerValue(name: string): string {
  const raw = readFileSync(path.join(HERE, '..', 'client', 'public', '_headers'), 'utf-8');
  const line = raw.split('\n').find(l => l.trim().startsWith(`${name}:`));
  if (!line) throw new Error(`_headers has no ${name}`);
  return line.trim().slice(name.length + 1).trim();
}

test('the app boots and works under its own Content-Security-Policy', async ({ page }) => {
  const csp = headerValue('Content-Security-Policy');

  const violations: string[] = [];
  page.on('console', m => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });

  await page.route('**/*', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });

  await page.addInitScript(() => localStorage.setItem('ironpath_tour_seen', '1'));
  await page.goto('/');

  await expect(page.getByRole('button', { name: "Start Today's Workout" })).toBeVisible();
  await page.getByRole('button', { name: "Start Today's Workout" }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await expect(page.getByLabel('Weight').first()).toBeVisible();
  await page.locator('button[aria-label^="Mark set"]').first().click();
  await page.waitForTimeout(2600);

  const saved = await page.evaluate(() => (localStorage.getItem('ironpath_workouts') ?? '').length > 2);
  expect(saved, 'nothing was saved under the CSP').toBe(true);

  // Export a backup. The other place this app builds a `blob:` URL, and the
  // one a CSP is most likely to break without any visible error.
  await page.getByRole('button', { name: 'Go back' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Backup' }).click();
  expect((await download).suggestedFilename(), 'backup export blocked').toMatch(/\.json$/);

  expect(violations, `the CSP blocked something the app needs:\n${violations.join('\n')}`).toEqual([]);
});

test('the policy actually restricts things', async () => {
  // A policy that permits everything would pass the test above too.
  const csp = headerValue('Content-Security-Policy');

  expect(csp, 'no default-src, so anything not named is unrestricted').toContain("default-src 'self'");
  // The one that makes "your data never leaves your device" enforceable rather
  // than a promise: injected code cannot post it to another origin.
  expect(csp, 'connect-src is not locked to self').toContain("connect-src 'self'");
  expect(csp, 'the page can be framed — clickjacking').toContain("frame-ancestors 'none'");
  expect(csp).not.toContain('*');
  expect(csp).not.toMatch(/script-src[^;]*https?:/);
});

test('the other headers are present and sane', async () => {
  expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
  // Privacy-positioned app: clicking out should not leak the full URL.
  expect(headerValue('Referrer-Policy')).toMatch(/strict-origin|no-referrer/);
  expect(headerValue('Permissions-Policy')).toContain('geolocation=()');
});

test('the celebration still fires under the CSP', async ({ page }) => {
  /*
   * This exists because it did not. canvas-confetti spawns its worker from a
   * `blob:` URL, `worker-src 'self'` blocked it, and the celebration silently
   * stopped firing — no error, no broken layout, just nothing. The first
   * version of the test above logged a set and never finished a workout, so it
   * never reached this path and the policy shipped broken.
   */
  const csp = headerValue('Content-Security-Policy');
  const blocked: string[] = [];
  page.on('console', m => {
    if (/Refused to|violates the following Content Security Policy/i.test(m.text())) {
      blocked.push(m.text());
    }
  });

  await page.route('**/*', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });

  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await page.addInitScript(([dt]) => {
    localStorage.setItem('ironpath_tour_seen', '1');
    localStorage.setItem('ironpath_current_id', '1');
    localStorage.setItem('ironpath_workouts', JSON.stringify([{
      id: 1, date: dt, type: 'Chest Day',
      exercises: [{
        code: 'S24', machine: 'Adjustable Cable Crossover', region: 'Chest Pecs',
        feel: 'Medium', sets: [{ weight: 60, reps: 15, rest: '1:00', completed: true }],
        bestWeight: 90, bestReps: 15, completed: true,
      }],
      abs: [],
      cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed: true },
      completed: false, duration: null, startedAt: null,
    }]));
  }, [date]);

  // Opening a workout already at 100% fires the celebration on mount.
  await page.goto('/workout/1');
  // `alertdialog`, not `dialog` — the celebration is a Radix AlertDialog, and
  // `getByRole('dialog')` does not match it. The message is one of ten chosen
  // at random, so the role is the stable thing to assert on.
  await expect(page.getByRole('alertdialog'), 'the celebration never appeared')
    .toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1200);

  expect(
    blocked.filter(b => /worker|blob/i.test(b)),
    'the CSP blocked the confetti worker — the celebration will not fire',
  ).toEqual([]);
});
