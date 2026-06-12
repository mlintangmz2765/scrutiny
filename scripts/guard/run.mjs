/** Hook orchestrator: `node scripts/guard/run.mjs pre-commit|pre-push`. */
import { spawnSync } from 'node:child_process';

const STEPS = {
  'pre-commit': [
    ['node', ['scripts/guard/check-staged.mjs']],
    ['pnpm', ['lint']],
  ],
  'pre-push': [
    ['node', ['scripts/guard/check-repo.mjs']],
    ['pnpm', ['typecheck']],
    ['pnpm', ['test']],
    ['pnpm', ['build']],
  ],
};

const mode = process.argv[2];
const steps = STEPS[mode];
if (!steps) {
  console.error(`guard: unknown mode "${mode}". Use: ${Object.keys(STEPS).join(' | ')}`);
  process.exit(1);
}

for (const [cmd, args] of steps) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`\nguard: ${mode} failed at "${cmd} ${args.join(' ')}" — fix the cause, never bypass hooks.`);
    process.exit(result.status ?? 1);
  }
}
console.log(`guard: ${mode} passed.`);
