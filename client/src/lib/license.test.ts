import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * The licence must say one thing.
 *
 * It said three at once: `package.json` claimed MIT, the README and `llms.txt`
 * claimed AGPLv3, and there was no LICENSE file at all — so GitHub reported the
 * repository as unlicensed, which legally reads as all rights reserved. MIT and
 * AGPL are close to opposites, so anyone deciding whether they could use the
 * code got three incompatible answers.
 *
 * Same shape as the version drift in version.test.ts, and the same fix: assert
 * the sources agree rather than trusting them to.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

describe('the licence', () => {
  it('has a LICENSE file, and it is the AGPL', () => {
    const file = path.join(REPO_ROOT, 'LICENSE');
    expect(existsSync(file), 'no LICENSE file — GitHub reads that as all rights reserved').toBe(true);

    const text = readFileSync(file, 'utf-8');
    expect(text).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
    expect(text).toContain('Version 3');
    // The real text is ~34KB; a stub would pass a header check alone.
    expect(text.length).toBeGreaterThan(30_000);
  });

  it('is declared as AGPL in package.json, using an SPDX identifier', () => {
    const pkg = JSON.parse(read('package.json')) as { license?: string };
    expect(pkg.license).toBe('AGPL-3.0-or-later');
  });

  it('is described as AGPL everywhere it is mentioned to a reader', () => {
    for (const file of ['README.md', 'client/public/llms.txt', 'client/index.html']) {
      expect(read(file), `${file} does not mention the licence`).toMatch(/AGPL/);
    }
  });

  it('is not also claimed to be MIT somewhere', () => {
    const claimsMit = ['package.json', 'README.md', 'client/public/llms.txt']
      .filter(f => /\bMIT\b/.test(read(f)));

    expect(claimsMit, 'these still claim MIT, contradicting the AGPL').toEqual([]);
  });
});
