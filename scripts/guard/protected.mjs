import { createHash } from 'node:crypto';

/**
 * The repo guard. These files define WHAT to build and HOW the guard works;
 * agents must never edit them to make a failing task "pass" (docs/PLAN.md §3).
 * Intentional changes require a human: regenerate the manifest with
 * `node scripts/guard/update-plan-manifest.mjs` and commit with [plan-change].
 */
export const MANIFEST_PATH = 'docs/.guard/plan-manifest.json';

export const PROTECTED_FILES = [
  'CLAUDE.md',
  'docs/PLAN.md',
  'docs/PLAN-V2.md',
  'docs/DOMAIN.md',
  'docs/ARCHITECTURE.md',
  'docs/DESIGN.md',
  MANIFEST_PATH,
  '.github/workflows/ci.yml',
  '.claude/settings.json',
  // Core gate configuration — weakening lint/strictness is a gate violation.
  'eslint.config.js',
  'tsconfig.base.json',
];

export const PROTECTED_DIRS = ['docs/phases/', 'scripts/guard/', '.husky/'];

/** Husky's generated runtime dir — not part of the protected content set. */
export const WALK_IGNORE = ['.husky/_/'];

export const OVERRIDE_MARKER = '[plan-change]';

export function normalize(p) {
  return p.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function isProtected(p) {
  const n = normalize(p);
  if (WALK_IGNORE.some((d) => n.startsWith(d))) return false;
  return PROTECTED_FILES.includes(n) || PROTECTED_DIRS.some((d) => n.startsWith(d));
}

/** Line-ending-stable hash so CRLF checkouts equal LF checkouts. */
export function hashContent(content) {
  return createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex');
}
