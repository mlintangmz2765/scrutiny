import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    templateDb: string;
  }
}

/**
 * Pushes the Prisma schema into one template SQLite file for the whole run.
 * Workers copy it per test file — running `prisma db push` once per worker
 * process caused lock contention and timeouts.
 */
export default function globalSetup(project: TestProject) {
  const dir = mkdtempSync(join(tmpdir(), 'scrutiny-template-'));
  const dbPath = join(dir, 'template.db');
  execSync('pnpm exec prisma db push --skip-generate', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${dbPath.replace(/\\/g, '/')}` },
    stdio: 'ignore',
  });
  project.provide('templateDb', dbPath);

  return () => {
    rmSync(dir, { recursive: true, force: true });
  };
}
