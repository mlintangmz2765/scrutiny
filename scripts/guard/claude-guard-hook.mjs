/**
 * Claude Code PreToolUse hook (wired in .claude/settings.json): blocks agents
 * from editing protected plan/guard files and from running commands that
 * bypass the git-hook guard. Exit code 2 = block the tool call and feed the
 * message back to the agent.
 */
import path from 'node:path';
import { isProtected, normalize } from './protected.mjs';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let payload = {};
try {
  // Strip a UTF-8 BOM (some shells prepend one when piping).
  payload = JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''));
} catch {
  process.exit(0);
}

const tool = payload.tool_name ?? '';
const input = payload.tool_input ?? {};
const cwd = payload.cwd ?? process.cwd();

function deny(reason) {
  console.error(reason);
  process.exit(2);
}

if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const filePath = input.file_path ?? input.notebook_path ?? '';
  if (filePath) {
    const rel = normalize(
      path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath,
    );
    if (!rel.startsWith('..') && isProtected(rel) && process.env.SCRUTINY_ALLOW_PLAN_EDIT !== '1') {
      deny(
        `BLOCKED by repo guard: "${rel}" is a protected plan/guard file (docs/PLAN.md §3.2). ` +
          `The plan is never edited to make a failing task pass — if you are blocked, record it ` +
          `in docs/BLOCKERS.md and move to the next unblocked task. Human-approved plan changes ` +
          `only: set SCRUTINY_ALLOW_PLAN_EDIT=1, regenerate the manifest with ` +
          `"node scripts/guard/update-plan-manifest.mjs", and commit with [plan-change].`,
      );
    }
  }
}

if (tool === 'Bash' || tool === 'PowerShell') {
  const command = String(input.command ?? '');
  const banned = [
    [/--no-verify\b/, 'git hooks must not be bypassed (--no-verify)'],
    [/\s-n\s+(?=.*\bgit\s+commit\b)/, 'git hooks must not be bypassed (commit -n)'],
    [/--no-gpg-sign\b/, 'commit signing must not be bypassed'],
    [/\bHUSKY\s*=\s*0\b/, 'husky must not be disabled (HUSKY=0)'],
    [/core\.hooksPath/i, 'git core.hooksPath must not be changed'],
    [/\bpush\b[^\n;|&]*(\s--force\b|\s-f\b)/, 'force-push is not allowed'],
  ];
  for (const [re, why] of banned) {
    if (re.test(command)) {
      deny(
        `BLOCKED by repo guard: ${why}. The quality gate exists to catch real problems — ` +
          `fix the underlying failure instead (docs/PLAN.md §3.2).`,
      );
    }
  }
}

process.exit(0);
