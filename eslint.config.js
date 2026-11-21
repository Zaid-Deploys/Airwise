/**
 * AIRWISE — ESLint Flat Configuration
 *
 * Minimal, targeted static analysis rules focused on:
 * - TypeScript type safety (no-explicit-any, consistent-type-imports)
 * - React hooks correctness (rules-of-hooks, exhaustive-deps)
 * - Code hygiene (no-unused-vars aligned with tsconfig noUnusedLocals)
 *
 * This config deliberately avoids stylistic/formatting rules
 * (handled by IDE and existing code conventions).
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/vite-env.d.ts',
    ],
  },

  // ── Base: ESLint recommended ────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript: strict rules (without type-checked for speed) ──
  ...tseslint.configs.strict,

  // ── Server-specific overrides ───────────────────────────────────
  {
    files: ['server/src/**/*.ts'],
    rules: {
      // Allow unused vars prefixed with _ (common for Express middleware signatures)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // ── Client-specific: React hooks ────────────────────────────────
  {
    files: ['client/src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Allow unused vars prefixed with _ (common for destructured props)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // ── Test files: relax strict rules ──────────────────────────────
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
