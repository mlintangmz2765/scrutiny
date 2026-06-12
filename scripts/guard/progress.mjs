/** Parses and validates the PROGRESS.md task board against the plan manifest. */

const ROW_RE = /^\|\s*(T-\d{2}\.\d+)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/;
const TASK_ID_RE = /^T-\d{2}\.\d+$/;
const STATUS_ICONS = ['⬜', '🟨', '✅', '⛔'];

export function parseProgressTasks(text) {
  const tasks = new Map();
  for (const line of text.split('\n')) {
    const m = line.match(ROW_RE);
    if (!m) continue;
    const prereqs = m[3]
      .split(',')
      .map((s) => s.trim())
      .filter((s) => TASK_ID_RE.test(s));
    tasks.set(m[1], { prereqs, status: m[4].trim() });
  }
  return tasks;
}

export function validateProgress(progressText, manifestTasks) {
  const errors = [];
  const rows = parseProgressTasks(progressText);

  for (const [id, manifestTask] of Object.entries(manifestTasks)) {
    const row = rows.get(id);
    if (!row) {
      errors.push(`PROGRESS.md: task ${id} is missing (tasks may not be deleted).`);
      continue;
    }
    const want = [...manifestTask.prereqs].sort().join(',');
    const got = [...row.prereqs].sort().join(',');
    if (want !== got) {
      errors.push(
        `PROGRESS.md: task ${id} prerequisites changed (expected "${want || 'none'}", found "${got || 'none'}").`,
      );
    }
    if (!STATUS_ICONS.some((icon) => row.status.startsWith(icon))) {
      errors.push(`PROGRESS.md: task ${id} has an unknown status "${row.status}".`);
    }
  }

  for (const id of rows.keys()) {
    if (!manifestTasks[id]) {
      errors.push(
        `PROGRESS.md: task ${id} is not in the plan manifest — adding tasks is a plan change ` +
          `(update the manifest and commit with the override marker).`,
      );
    }
  }

  for (const [id, row] of rows) {
    if (!row.status.startsWith('✅')) continue;
    for (const prereq of row.prereqs) {
      const dep = rows.get(prereq);
      if (dep && !dep.status.startsWith('✅')) {
        errors.push(
          `PROGRESS.md: task ${id} is done but its prerequisite ${prereq} is not — ` +
            `tasks must be executed in dependency order (docs/PLAN.md §3).`,
        );
      }
    }
  }

  return errors;
}
