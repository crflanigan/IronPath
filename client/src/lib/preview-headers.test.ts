import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * The CSP the public site serves must stay strict.
 *
 * Netlify's deploy-preview toolbar is an iframe from https://app.netlify.com,
 * which `default-src 'self'` blocks — leaving an empty bar at the bottom of
 * every preview that cannot be dismissed. The fix relaxes `frame-src`, but
 * only for the deploy-preview context, via a build command in netlify.toml.
 *
 * These guard the boundary, because the failure is quiet in both directions:
 * a relaxation that leaked into production would weaken the site with nothing
 * to see, and a script that silently stopped applying would leave previews
 * broken exactly as they are now.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

describe('the production CSP', () => {
  const headers = read('client/public/_headers');

  it('does not allow framing anything, including Netlify', () => {
    expect(headers).not.toMatch(/frame-src/);
    expect(headers).not.toMatch(/app\.netlify\.com/);
  });

  it('still forbids the app from talking to anywhere but itself', () => {
    // The directive that makes "your training data never leaves your device"
    // enforceable by the browser. Nothing about the preview fix may touch it.
    expect(headers).toMatch(/connect-src 'self'/);
  });
});

describe('the deploy-preview relaxation', () => {
  const toml = read('netlify.toml');

  /**
   * The `command = "..."` under each section, ignoring comments.
   *
   * Matching raw text does not work: the comment above `[context.deploy-preview]`
   * names the script, so a substring search finds it in the production half of
   * the file and reports a leak that is not there.
   */
  const commandsByContext = () => {
    const result: Record<string, string> = {};
    let section = 'build';
    for (const raw of toml.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('#')) continue;
      const heading = line.match(/^\[(.+)\]$/);
      if (heading) {
        section = heading[1];
        continue;
      }
      const command = line.match(/^command\s*=\s*"(.*)"$/);
      if (command) result[section] = command[1];
    }
    return result;
  };

  it('is scoped to the deploy-preview context, not the production build', () => {
    const commands = commandsByContext();

    expect(Object.keys(commands)).toContain('context.deploy-preview');
    // The command the public site is built with must not run the relaxation.
    expect(commands.build).toBeDefined();
    expect(commands.build).not.toMatch(/allow-preview-toolbar/);
  });

  it('runs the script that performs it', () => {
    const previewCommand = commandsByContext()['context.deploy-preview'] ?? '';

    expect(previewCommand).toMatch(/allow-preview-toolbar\.mjs/);
    // Still builds first — the script edits the build's output.
    expect(previewCommand).toMatch(/npm run build\s*&&/);
  });

  it('has the script it points at', () => {
    const script = read('scripts/allow-preview-toolbar.mjs');
    expect(script).toMatch(/frame-src/);
    expect(script).toMatch(/app\.netlify\.com/);
    // It must refuse rather than no-op when the CSP is not where it expects.
    expect(script).toMatch(/throw new Error/);
  });
});
