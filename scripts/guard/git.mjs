import { execFileSync } from 'node:child_process';

export function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...opts });
}

export function stagedFiles() {
  return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .filter(Boolean);
}

export function allStagedPaths() {
  return git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
}

/** Content of a tracked file as it will be committed (the index version). */
export function indexContent(path) {
  try {
    return git(['show', `:${path}`]);
  } catch {
    return null;
  }
}

export function trackedFiles() {
  return git(['ls-files']).split('\n').filter(Boolean);
}

/** Added lines per file from the staged diff. */
export function stagedAdditions() {
  const diff = git(['diff', '--cached', '-U0', '--no-color', '--diff-filter=ACMR']);
  const additions = new Map();
  let current = null;
  let lineNo = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      current = line.slice('+++ b/'.length);
      additions.set(current, []);
      continue;
    }
    if (line.startsWith('+++')) {
      current = null;
      continue;
    }
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (current && line.startsWith('+') && !line.startsWith('+++')) {
      additions.get(current).push({ line: lineNo, text: line.slice(1) });
      lineNo += 1;
    }
  }
  return additions;
}
