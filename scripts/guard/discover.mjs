import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PROTECTED_DIRS, PROTECTED_FILES, WALK_IGNORE, normalize } from './protected.mjs';

/** Every protected file currently on disk (relative, forward slashes). */
export function discoverProtectedFiles(root = process.cwd()) {
  const found = new Set();

  for (const file of PROTECTED_FILES) {
    if (existsSync(join(root, file))) found.add(file);
  }

  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    for (const entry of readdirSync(abs)) {
      const childRel = normalize(join(rel, entry));
      if (WALK_IGNORE.some((d) => childRel.startsWith(d) || `${childRel}/`.startsWith(d))) {
        continue;
      }
      const childAbs = join(root, childRel);
      if (statSync(childAbs).isDirectory()) walk(childRel);
      else found.add(childRel);
    }
  };
  for (const dir of PROTECTED_DIRS) walk(dir.replace(/\/$/, ''));

  return [...found].sort();
}
