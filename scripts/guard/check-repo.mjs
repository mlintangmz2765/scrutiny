/**
 * Full-tree guard: plan/guard file integrity, task-graph consistency, and
 * forbidden source patterns. Run by pre-push, CI, and `pnpm guard`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { discoverProtectedFiles } from './discover.mjs';
import { trackedFiles } from './git.mjs';
import { isScannable, scanContent } from './patterns.mjs';
import { validateProgress } from './progress.mjs';
import { MANIFEST_PATH, OVERRIDE_MARKER, hashContent } from './protected.mjs';

const errors = [];

if (!existsSync(MANIFEST_PATH)) {
  console.error(`guard: ${MANIFEST_PATH} is missing. Run scripts/guard/update-plan-manifest.mjs.`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

for (const [file, expected] of Object.entries(manifest.checksums)) {
  if (!existsSync(file)) {
    errors.push(`integrity: protected file "${file}" was deleted.`);
    continue;
  }
  if (hashContent(readFileSync(file, 'utf8')) !== expected) {
    errors.push(`integrity: protected file "${file}" was modified without a manifest update.`);
  }
}

for (const file of discoverProtectedFiles()) {
  if (file !== MANIFEST_PATH && !manifest.checksums[file]) {
    errors.push(`integrity: new protected file "${file}" is not in the manifest.`);
  }
}

errors.push(...validateProgress(readFileSync('docs/PROGRESS.md', 'utf8'), manifest.tasks));

for (const file of trackedFiles()) {
  if (!isScannable(file) || !existsSync(file)) continue;
  errors.push(...scanContent(file, readFileSync(file, 'utf8')));
}

if (errors.length > 0) {
  console.error('guard: repository check FAILED:\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(
    `\nPlan and guard files are protected (docs/PLAN.md §3). Never edit them to make a ` +
      `task pass — record a blocker in docs/BLOCKERS.md instead. Intentional, human-approved ` +
      `plan changes: run "node scripts/guard/update-plan-manifest.mjs" and commit with ${OVERRIDE_MARKER}.`,
  );
  process.exit(1);
}
console.log('guard: repository check passed.');
