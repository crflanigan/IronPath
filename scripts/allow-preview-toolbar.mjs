/**
 * Let Netlify's deploy-preview toolbar through the CSP — on previews only.
 *
 * The toolbar is the bar at the bottom of a deploy preview. It is an iframe
 * pointing at https://app.netlify.com, and the site's CSP declares no
 * `frame-src`, so it falls back to `default-src 'self'` and the browser
 * blocks it:
 *
 *   Framing 'https://app.netlify.com/' violates the following Content
 *   Security Policy directive: "default-src 'self'".
 *
 * A blocked iframe still occupies the page, but has nothing inside it — so it
 * covers the bottom of the preview and cannot be dismissed. That makes
 * testing a preview on a phone materially worse, which is the whole point of
 * having previews.
 *
 * Netlify's headers in `netlify.toml` are global and cannot be scoped to a
 * deploy context, but build *commands* can. So `netlify.toml` runs this after
 * the build for the deploy-preview context only, and production never sees it.
 *
 * The relaxed policy is derived from the real one rather than written out
 * again. A second copy of the CSP would drift from the first, which is the
 * failure this repo has already had with the version number and the licence.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const HEADERS = 'dist/_headers';
const DIRECTIVE = "frame-src 'self' https://app.netlify.com";

const original = readFileSync(HEADERS, 'utf8');

// Fail loudly rather than silently writing the file back unchanged. A no-op
// here would ship a "fix" that changes nothing and looks like it worked.
const cspLine = original
  .split('\n')
  .find(line => line.trim().startsWith('Content-Security-Policy:'));

if (!cspLine) {
  throw new Error(
    `${HEADERS} has no Content-Security-Policy line — refusing to guess. ` +
      `If the CSP moved, update this script.`,
  );
}

if (cspLine.includes('frame-src')) {
  throw new Error(
    `${HEADERS} already declares frame-src. This script only knows how to add ` +
      `one, so the two would conflict. Reconcile them by hand.`,
  );
}

// Insert before the trailing directives so the line stays readable; any
// position is equivalent to the browser.
const relaxed = cspLine.replace(
  'frame-ancestors',
  `${DIRECTIVE}; frame-ancestors`,
);

if (relaxed === cspLine) {
  throw new Error(`Could not insert ${DIRECTIVE} into the CSP — anchor not found.`);
}

writeFileSync(HEADERS, original.replace(cspLine, relaxed));

console.log(`[preview] CSP relaxed for the Netlify toolbar: ${DIRECTIVE}`);
