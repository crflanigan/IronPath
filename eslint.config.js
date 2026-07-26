import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Deliberately scoped to rules that catch mistakes, not rules that enforce a
 * house style. Style disagreements in a codebase this size cost more attention
 * than they save; a hook with a missing dependency does not.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Unused code is usually a leftover from an edit that was not finished.
      // Underscore-prefixed names are the escape hatch for deliberate ones.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      // `any` is sometimes the honest answer at a boundary; flag it without
      // blocking a commit over it.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Building code from strings. The one legitimate use is the service
      // worker test, which evaluates sw.js on purpose and says so with a
      // disable comment; anything new should have to argue for itself.
      'no-new-func': 'error',

      // A dependency array that lies is a real bug, and one this codebase has
      // already produced — a memo keyed on a `new Date()` never cached anything.
      'react-hooks/exhaustive-deps': 'warn',

      // These three flag genuine patterns worth revisiting — setState inside an
      // effect, mutation where the compiler expects none — but there are ~18 of
      // them and unpicking each is a refactor with real regression risk in an
      // app someone uses several times a week. Visible as warnings, deliberately
      // not blocking, rather than switched off and forgotten.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
    },
  },

  // `shared/schema.ts` imports drizzle-orm/pg-core to describe Postgres tables
  // nothing queries. The client uses it for *types only*; importing a value from
  // there drags the whole Postgres query builder into the browser bundle, which
  // is how ~19KB of it shipped once already. Runtime validators live in
  // `shared/workout-schemas.ts`, which has no database import.
  //
  // bundle-boundaries.test.ts asserts this against the built output. This rule
  // is the same check at edit time, where it is cheaper to act on.
  {
    files: ['client/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@shared/schema',
              allowTypeImports: true,
              message:
                'Import types only (`import type`). For runtime validators use @shared/workout-schemas — @shared/schema pulls drizzle-orm into the browser bundle.',
            },
          ],
          patterns: [
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'drizzle-zod'],
              message: 'Database code must not reach the client bundle.',
            },
          ],
        },
      ],
    },
  },

  // shadcn/ui components and the toast hook are generated, vendored code. Held
  // to the syntax rules but not to our stricter ones — churn there is noise.
  {
    files: ['client/src/components/ui/**', 'client/src/hooks/use-toast.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },

  // Tailwind's own documented plugin syntax.
  {
    files: ['tailwind.config.ts', 'postcss.config.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // The service worker is plain script served as-is, with its own globals.
  {
    files: ['client/public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
  },
);
