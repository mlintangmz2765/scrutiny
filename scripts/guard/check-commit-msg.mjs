/**
 * commit-msg hook: enforces the commit format from docs/PLAN.md §3.1 and the
 * [plan-change] marker whenever protected files are part of the commit.
 */
import { readFileSync } from 'node:fs';
import { allStagedPaths } from './git.mjs';
import { OVERRIDE_MARKER, isProtected } from './protected.mjs';

const msgFile = process.argv[2];
if (!msgFile) {
  console.error('guard: check-commit-msg.mjs expects the commit message file as argument.');
  process.exit(1);
}
const message = readFileSync(msgFile, 'utf8');
const firstLine = (message.split('\n')[0] ?? '').trim();

if (/^(Merge|Revert|fixup!|squash!)/.test(firstLine)) process.exit(0);

const errors = [];

const FEAT_RE = /^feat\(phase-\d{2}\): T-\d{2}\.\d+ .+/;
const OTHER_RE = /^(fix|chore|docs|test|refactor|ci|perf|build|style)(\([\w ./-]+\))?: .+/;
if (!FEAT_RE.test(firstLine) && !OTHER_RE.test(firstLine)) {
  errors.push(
    `commit message "${firstLine}" does not match the required format:\n` +
      `      feat(phase-XX): T-XX.Y <description>   (task commits)\n` +
      `      fix|chore|docs|test|refactor|ci(scope)?: <description>`,
  );
}

const protectedTouched = allStagedPaths().filter(isProtected);
if (protectedTouched.length > 0 && !message.includes(OVERRIDE_MARKER)) {
  errors.push(
    `this commit touches protected plan/guard files but lacks the ${OVERRIDE_MARKER} marker:\n` +
      protectedTouched.map((f) => `      - ${f}`).join('\n') +
      `\n    Plan files are never edited to make a task pass (docs/PLAN.md §3.2). If this is a\n` +
      `    human-approved plan change, add ${OVERRIDE_MARKER} to the commit message.`,
  );
}

if (errors.length > 0) {
  console.error('guard: commit rejected:\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
