/**
 * Pre-commit guard: validates the INDEX (what is about to be committed) —
 * protected-file integrity, task-graph consistency, forbidden patterns in
 * added lines.
 */
import { indexContent, stagedAdditions } from './git.mjs';
import { GLOBAL_PATTERNS, TEST_FILE_RE, TEST_PATTERNS, isScannable } from './patterns.mjs';
import { validateProgress } from './progress.mjs';
import { MANIFEST_PATH, OVERRIDE_MARKER, hashContent } from './protected.mjs';

const errors = [];

const manifestRaw = indexContent(MANIFEST_PATH);
if (!manifestRaw) {
  console.error(`guard: ${MANIFEST_PATH} is missing from the index. It must never be deleted.`);
  process.exit(1);
}
const manifest = JSON.parse(manifestRaw);

for (const [file, expected] of Object.entries(manifest.checksums)) {
  const content = indexContent(file);
  if (content === null) {
    errors.push(`integrity: protected file "${file}" would be deleted by this commit.`);
    continue;
  }
  if (hashContent(content) !== expected) {
    errors.push(
      `integrity: protected file "${file}" is modified but the manifest was not regenerated.`,
    );
  }
}

const progress = indexContent('docs/PROGRESS.md');
if (progress === null) {
  errors.push('integrity: docs/PROGRESS.md would be deleted by this commit.');
} else {
  errors.push(...validateProgress(progress, manifest.tasks));
}

for (const [file, lines] of stagedAdditions()) {
  if (!isScannable(file)) continue;
  const checks = [...GLOBAL_PATTERNS, ...(TEST_FILE_RE.test(file) ? TEST_PATTERNS : [])];
  for (const { line, text } of lines) {
    for (const { re, label } of checks) {
      if (re.test(text)) errors.push(`${file}:${line}: forbidden pattern — ${label}`);
    }
  }
}

if (errors.length > 0) {
  console.error('guard: pre-commit check FAILED:\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    `\nFix the cause — do not bypass hooks. Human-approved plan changes: run ` +
      `"node scripts/guard/update-plan-manifest.mjs", stage the manifest, and include ` +
      `${OVERRIDE_MARKER} in the commit message.`,
  );
  process.exit(1);
}
console.log('guard: pre-commit check passed.');
