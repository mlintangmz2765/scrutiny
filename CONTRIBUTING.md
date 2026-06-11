# Contributing to Scrutiny

Scrutiny is built task-by-task from an execution-ready plan. Whether you are a human or
an AI agent, the workflow is the same:

1. Read [docs/PLAN.md](docs/PLAN.md) §3 — the execution model is mandatory.
2. Pick the first `⬜ todo` task in [docs/PROGRESS.md](docs/PROGRESS.md) whose
   prerequisites are done, and read its phase file in `docs/phases/` end to end.
3. Audit formulas come only from [docs/DOMAIN.md](docs/DOMAIN.md); conventions only from
   [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md); visual rules only from
   [docs/DESIGN.md](docs/DESIGN.md).
4. Before opening a PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must all
   pass, and the task's acceptance checklist must be satisfied.
5. Commit format: `feat(phase-XX): T-XX.Y <short description>`.

Everything in this repository is in English. License: AGPL-3.0 — contributions are
accepted under the same license.
