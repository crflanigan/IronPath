import { describe, expect, it } from 'vitest';

/**
 * `shared/schema.ts` imports `drizzle-orm/pg-core` to describe the Postgres
 * tables. Importing a *value* from it therefore drags the table builder into
 * whatever bundle did the importing — and the client is a browser app with no
 * database.
 *
 * That is how ~36KB of Postgres schema machinery ended up shipping to phones:
 * one file needed the zod validators, which live in the same module. The
 * runtime schemas now live in `shared/workout-schemas.ts`, which imports only
 * zod.
 *
 * This guards the boundary statically, because the failure is silent — the
 * app works perfectly either way, it is just bigger.
 */

const CLIENT_SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

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

function importsValueFromSchemaModule(source: string): boolean {
  return importStatements(source).some(
    statement =>
      /from\s*['"]@shared\/schema['"]$/.test(statement.trim()) &&
      !/^import\s+type\b/.test(statement.trim()),
  );
}

describe('client bundle boundaries', () => {
  it('has client sources to check', () => {
    expect(Object.keys(CLIENT_SOURCES).length).toBeGreaterThan(20);
  });

  it('never imports a runtime value from @shared/schema', () => {
    // `import type { ... } from '@shared/schema'` is erased at compile time
    // and costs nothing. A plain `import { ... }` is not.
    const offenders = Object.entries(CLIENT_SOURCES)
      .filter(([, source]) => importsValueFromSchemaModule(source))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });

  it('keeps the runtime schema module free of Drizzle', async () => {
    const shared = import.meta.glob('../../../shared/*.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>;

    const entry = Object.entries(shared).find(([path]) =>
      path.endsWith('workout-schemas.ts'),
    );
    expect(entry).toBeDefined();
    expect(entry![1]).not.toMatch(/from\s*['"]drizzle/);
  });
});
