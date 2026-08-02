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

/**
 * The version alone could not say which build you were looking at. It moves
 * only at release time, so every deploy preview between releases showed the
 * same number as production — precisely when knowing the difference matters
 * most, because you are testing a preview and asking "is this the new one?".
 */
describe('the build identity', () => {
  const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf-8');
  const config = read('vite.config.ts');

  it('is injected at build time, like the version', () => {
    expect(config).toMatch(/__APP_BUILD__:\s*JSON\.stringify/);
  });

  it('comes from the deploy, not from anything committed', () => {
    // Hardcoding it would go stale the moment it was written.
    expect(config).toContain('process.env.COMMIT_REF');
    expect(config).toContain('process.env.REVIEW_ID');
  });

  it('is declared, so a typo is a compile error rather than "undefined"', () => {
    expect(read('client/src/global.d.ts')).toContain('__APP_BUILD__');
  });

  it('is shown beside the version in Settings', () => {
    const settings = read('client/src/components/SettingsDialog.tsx');
    expect(settings).toContain('__APP_VERSION__');
    expect(settings).toContain('__APP_BUILD__');
  });
});
