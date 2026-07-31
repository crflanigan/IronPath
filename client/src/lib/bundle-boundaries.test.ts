import { describe, expect, it } from 'vitest';

/**
 * `shared/` is imported by the browser, so whatever it imports ships to phones.
 *
 * That is how ~36KB of Postgres schema machinery once ended up in the bundle:
 * `shared/schema.ts` described Drizzle tables purely to derive TypeScript
 * types, and one file needed the zod validators that lived beside them. The
 * Drizzle definitions are gone and the types come from zod directly, so the
 * older rule this file enforced — "never import a *value* from @shared/schema"
 * — no longer applies; that module is now zod and nothing else.
 *
 * What is worth guarding is the general form of the mistake, because it is
 * silent: the app works perfectly either way, it is just bigger. Anything
 * `shared/` imports is a dependency every visitor downloads.
 */

const SHARED_SOURCES = import.meta.glob('../../../shared/*.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Packages `shared/` is allowed to pull into the browser bundle. */
const ALLOWED = new Set(['zod']);

/** Strip comments so prose about the rule is not mistaken for a violation. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Split a file into whole import statements before testing them.
 *
 * Matching a single regex against the file does not work: several of these
 * files omit semicolons, so a character class like `[^;]*` runs straight past
 * the end of one import and into the next, and an innocent `import type` line
 * gets attributed to the plain `import` above it.
 */
function importStatements(source: string): string[] {
  return stripComments(source).match(/import[\s\S]*?from\s*['"][^'"]+['"]/g) ?? [];
}

/**
 * Packages a file imports as runtime values.
 *
 * `import type { ... } from 'x'` is erased at compile time and costs nothing,
 * so it is not a violation. A plain `import { ... }` is.
 */
function runtimePackageImports(source: string): string[] {
  return importStatements(source)
    .filter(statement => !/^import\s+type\b/.test(statement.trim()))
    .map(statement => statement.match(/from\s*['"]([^'"]+)['"]/)?.[1] ?? '')
    // Relative imports stay inside shared/ and are covered by checking every
    // file in the directory.
    .filter(specifier => specifier && !specifier.startsWith('.'))
    // '@scope/name/sub' and 'name/sub' both bill to the package, not the path.
    .map(specifier =>
      specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0],
    );
}

describe('client bundle boundaries', () => {
  it('has shared sources to check', () => {
    expect(Object.keys(SHARED_SOURCES).length).toBeGreaterThan(0);
  });

  it('imports nothing but zod into the browser from shared/', () => {
    const offenders = Object.entries(SHARED_SOURCES).flatMap(([path, source]) =>
      runtimePackageImports(source)
        .filter(pkg => !ALLOWED.has(pkg))
        .map(pkg => `${path} imports ${pkg}`),
    );

    expect(offenders).toEqual([]);
  });

  it('has no Drizzle left anywhere in shared/', () => {
    // Type-only imports are erased, so the rule above would not catch a
    // `import type { ... } from 'drizzle-orm'` creeping back in to describe
    // tables for a database this app does not have.
    const offenders = Object.entries(SHARED_SOURCES)
      .filter(([, source]) => /from\s*['"]drizzle/.test(stripComments(source)))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});
