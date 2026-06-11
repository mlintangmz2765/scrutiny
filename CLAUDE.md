# Scrutiny — Agent Instructions

Open-source audit platform for financial statement audits (ISA-aligned): trial balance
import, FSLI mapping, adjusting entries, materiality, risk assessment, analytics
(Benford, JE testing, ratios), MUS sampling, working papers with sign-offs, SUM,
Excel exports, archive, roll-forward.

## Before doing ANY work

1. Read [docs/PLAN.md](docs/PLAN.md) §3 (execution model — mandatory protocol).
2. Find your task in [docs/PROGRESS.md](docs/PROGRESS.md) (first `⬜ todo` whose prereqs
   are `✅ done`), then read its phase file in `docs/phases/` completely.
3. Audit formulas/definitions come ONLY from [docs/DOMAIN.md](docs/DOMAIN.md).
   Stack/conventions come ONLY from [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
   Never invent audit math; never deviate from conventions without an entry in
   `docs/DECISIONS.md`.

## Stack (summary — details in ARCHITECTURE.md)

pnpm monorepo: `packages/shared` (Zod schemas + pure domain math), `apps/server`
(Fastify 5 + Prisma 6 + SQLite), `apps/web` (React 19 + Vite + Tailwind 4 + TanStack
Query + React Router). Tests: Vitest (+ Playwright in Phase 9 only).

## Commands

```bash
pnpm install            # root, once
pnpm dev                # server :3001 + web :5173
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # quality gate — must pass
pnpm db:migrate         # prisma migrate dev
pnpm db:seed            # seed admin + FSLI taxonomy + demo data
```

## Hard rules

- **English only** — code, comments, UI strings, commits, docs.
- **Money = integer minor units** (Prisma BigInt → safe JS number via `assertSafeAmount`).
  Never float for money. Rounding only via `roundHalfAwayFromZero`. Debit +, credit −.
- **Strict TS**: no `any`, no `@ts-ignore`/`@ts-expect-error`, no `!` outside tests.
- **Never weaken the gate**: no skipped tests, no `eslint-disable` to pass CI. Fix causes.
- Pure calculations live in `packages/shared/src/domain/` with exact-value tests against
  DOMAIN.md worked examples. Services hold logic; route handlers only validate/delegate.
- Every endpoint: Zod-validated input, error envelope
  `{error:{code,message}}`, auth required by default, engagement access via
  `requireEngagementAccess`, mutations guarded by `archivedGuard`.
- One task = implement → all acceptance checks pass → quality gate green → update
  PROGRESS.md → commit `feat(phase-XX): T-XX.Y <description>`.
- Blocked? Write `docs/BLOCKERS.md` (task id, attempts, exact error) and move to the next
  unblocked task. Never edit plan files to make a failing task "pass".

## UI foundation

Design tokens, layout primitives, and reusable components live in
`apps/web/src/components/ui/` and `apps/web/src/styles/` — reuse them; do not invent
one-off styles. See [docs/DESIGN.md](docs/DESIGN.md).
