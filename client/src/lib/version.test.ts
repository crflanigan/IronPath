import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * The app's version used to live in three places that disagreed: the newest git
 * tag said v1.1.1, the Settings dialog had "IronPath v1.1.2" typed into it by
 * hand — a version never tagged — and package.json still said 1.0.0.
 *
 * package.json is now the only source. These tests guard both halves of that:
 * that the build actually substitutes it, and that nobody hardcodes it back.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');

function packageVersion(): string {
  const pkg = JSON.parse(
    readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'),
  ) as { version: string };
  return pkg.version;
}

/** Source text, so a hardcoded version is caught without rendering anything. */
const CLIENT_SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

describe('the displayed app version', () => {
  it('is substituted at build time from package.json', () => {
    // If the `define` were missing from a config, this would not merely differ
    // — referencing it would throw.
    expect(__APP_VERSION__).toBe(packageVersion());
  });

  it('is a plausible semver, so an empty define cannot pass silently', () => {
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('is not typed by hand anywhere in the client', () => {
    const offenders = Object.entries(CLIENT_SOURCES)
      // This file necessarily contains version-shaped text.
      .filter(([file]) => !file.endsWith('version.test.ts'))
      .filter(([, source]) =>
        // "IronPath v1.2.0" or similar sitting in JSX or a string.
        /IronPath\s+v\d+\.\d+\.\d+/.test(source),
      )
      .map(([file]) => file);

    expect(offenders).toEqual([]);
  });
});
