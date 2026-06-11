# Scrutiny

**Open-source audit platform for financial statement audits.** An ISA-aligned, self-hosted
alternative to commercial audit suites (CaseWare, IDEA, TeamMate): engagement binders,
trial balance import and FSLI mapping, adjusting entries, materiality, risk assessment,
data analytics (Benford, journal entry testing, ratios), MUS sampling, working papers
with sign-offs, misstatement evaluation, Excel exports, archiving, and roll-forward.

> ⚠️ **Status: pre-alpha.** The full plan is in [docs/PLAN.md](docs/PLAN.md);
> live progress in [docs/PROGRESS.md](docs/PROGRESS.md).

## Quickstart (development)

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev        # API on http://localhost:3001, web on http://localhost:5173
```

Default login (development): `admin@scrutiny.local` / `admin-change-me-now`.

## Stack

TypeScript everywhere. Fastify 5 + Prisma 6 + SQLite (server), React 19 + Vite +
Tailwind 4 (web), Zod schemas and pure audit math in a shared package, Vitest +
Playwright. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Doc | What's in it |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Vision, scope, phase roadmap, execution model |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, conventions, API/auth/money rules |
| [docs/DOMAIN.md](docs/DOMAIN.md) | Audit domain reference — all formulas and defaults |
| [docs/DESIGN.md](docs/DESIGN.md) | Design system |
| [docs/phases/](docs/phases/) | Step-by-step build tasks (Phase 0–9) |

## Contributing

Read [docs/PLAN.md](docs/PLAN.md) §3 first — the repo is built task-by-task with strict
acceptance criteria. License: AGPL-3.0.
