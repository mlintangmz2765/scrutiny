/**
 * Forbidden source patterns (docs/PLAN.md §3.2 "never weaken the gate").
 * Literals are concatenated so this file never matches its own rules.
 */

export const CODE_FILE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
export const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

/** Never allowed in any code file. */
export const GLOBAL_PATTERNS = [
  { re: new RegExp('@ts-' + 'ignore'), label: '@ts-' + 'ignore' },
  { re: new RegExp('@ts-' + 'expect-error'), label: '@ts-' + 'expect-error' },
  { re: new RegExp('eslint-' + 'disable'), label: 'eslint-' + 'disable' },
];

/** Never allowed in test files: skipped or focused tests. */
export const TEST_PATTERNS = [
  { re: /\.only\s*\(/, label: 'focused test (.only)' },
  { re: /\.skip\s*\(/, label: 'skipped test (.skip)' },
  { re: /\bxit\s*\(/, label: 'skipped test (xit)' },
  { re: /\bxdescribe\s*\(/, label: 'skipped suite (xdescribe)' },
];

/** The guard's own sources mention the patterns as data — exclude them. */
export function isScannable(path) {
  return (
    CODE_FILE_RE.test(path) &&
    !path.startsWith('scripts/guard/') &&
    !path.includes('node_modules/') &&
    !path.includes('/dist/')
  );
}

export function scanContent(path, content) {
  const findings = [];
  const lines = content.split('\n');
  const checks = [...GLOBAL_PATTERNS, ...(TEST_FILE_RE.test(path) ? TEST_PATTERNS : [])];
  lines.forEach((line, i) => {
    for (const { re, label } of checks) {
      if (re.test(line)) findings.push(`${path}:${i + 1}: forbidden pattern — ${label}`);
    }
  });
  return findings;
}
