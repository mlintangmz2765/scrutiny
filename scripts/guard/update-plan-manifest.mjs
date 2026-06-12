/**
 * Regenerates docs/.guard/plan-manifest.json from the current tree.
 * HUMAN-APPROVED PLAN CHANGES ONLY — the commit that includes the regenerated
 * manifest must carry the [plan-change] marker (enforced by the commit-msg hook).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { discoverProtectedFiles } from './discover.mjs';
import { parseProgressTasks } from './progress.mjs';
import { MANIFEST_PATH, OVERRIDE_MARKER, hashContent } from './protected.mjs';

const checksums = {};
for (const file of discoverProtectedFiles()) {
  if (file === MANIFEST_PATH) continue;
  checksums[file] = hashContent(readFileSync(file, 'utf8'));
}

const tasks = {};
for (const [id, { prereqs }] of parseProgressTasks(readFileSync('docs/PROGRESS.md', 'utf8'))) {
  tasks[id] = { prereqs };
}

if (Object.keys(tasks).length === 0) {
  console.error('guard: no tasks found in docs/PROGRESS.md — refusing to write an empty manifest.');
  process.exit(1);
}

const manifest = {
  comment:
    'Integrity manifest for plan and guard files. Regenerate ONLY for human-approved ' +
    `plan changes via "node scripts/guard/update-plan-manifest.mjs" and commit with ${OVERRIDE_MARKER}.`,
  generatedAt: new Date().toISOString(),
  checksums,
  tasks,
};

mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `guard: wrote ${MANIFEST_PATH} (${Object.keys(checksums).length} files, ` +
    `${Object.keys(tasks).length} tasks). Commit it with the ${OVERRIDE_MARKER} marker.`,
);
