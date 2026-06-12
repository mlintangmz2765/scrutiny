# Scrutiny — Master Plan

> Open-source audit platform for financial statement audits.
> This is the single source of truth for **what** we are building and **in what order**.
> How to build it (stack, conventions): see [ARCHITECTURE.md](./ARCHITECTURE.md).
> Audit domain knowledge (formulas, definitions): see [DOMAIN.md](./DOMAIN.md).
> Current status of every task: see [PROGRESS.md](./PROGRESS.md).

---

## 1. Vision

Scrutiny is an open-source alternative to commercial audit software such as CaseWare Working
Papers, CaseWare IDEA, TeamMate+, and ACL/Diligent. It supports the full lifecycle of a
financial statement audit performed under ISA-aligned standards:

1. **Engagement setup** — clients, engagements, team, roles.
2. **Planning** — materiality, risk assessment per FSLI and assertion, planning analytics.
3. **Fieldwork** — trial balance import and mapping, lead schedules, adjusting journal
   entries, audit sampling (random / systematic / MUS), journal entry testing, Benford
   analysis, ratio and variance analytics, evidence attachments.
4. **Review & completion** — working paper sign-offs, review notes, summary of unadjusted
   misstatements (SUM), completion checklist, archiving.
5. **Reporting** — adjusted trial balance, draft financial statements, Excel exports.
6. **Next year** — roll-forward of an engagement.

### Target users

Small and mid-size audit firms and internal audit departments that cannot afford (or do not
want) per-seat commercial licenses. Single-firm, self-hosted deployment (Docker or local).

### Non-goals for v1.0 (explicitly out of scope — do NOT build these)

- Multi-currency engagements (one currency per engagement).
- Group audits / consolidation.
- Multi-tenant SaaS, billing, org management.
- XBRL tagging, e-filing, digital signature integrations.
- Direct connectors to accounting systems (import is file-based: CSV/XLSX).
- AI/LLM features.
- Mobile apps.

If a task seems to require one of these, the task is being misread — re-read it.

---

## 2. Success criteria for v1.0

A user can, end to end, using only this software:

1. Create a client and an engagement for fiscal year N.
2. Import a trial balance (CSV/XLSX), map accounts to FSLI groups, and see a balanced TB.
3. Compute materiality (overall, performance, clearly trivial) from a benchmark.
4. Record risk assessments per FSLI × assertion.
5. Post adjusting journal entries and view the adjusted TB and lead schedules.
6. Import a general ledger file and run journal entry testing + Benford analysis.
7. Draw an MUS sample, record test results, and evaluate projected misstatement.
8. Accumulate misstatements in a SUM and compare against materiality.
9. Prepare/review sign-offs on working papers with review notes, then archive (freeze) the
   engagement.
10. Export adjusted TB, lead schedules, and SUM to Excel.
11. Roll the engagement forward to fiscal year N+1.

All of this with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` green and an
end-to-end Playwright test covering the happy path.

---

## 3. Execution model (READ THIS BEFORE DOING ANY WORK)

This plan is executed by AI agents. The rules below are mandatory.

### 3.1 Task protocol

1. Open [PROGRESS.md](./PROGRESS.md). Find the first task with status `⬜ todo` whose
   prerequisites are all `✅ done`.
2. Open the phase file in `docs/phases/` that contains the task. Read the **whole phase
   file**, plus every DOMAIN.md / ARCHITECTURE.md section it references.
3. Implement **exactly** what the task says. Do not add features, do not refactor unrelated
   code, do not "improve" the plan. If the plan is ambiguous, choose the simplest
   interpretation consistent with DOMAIN.md and write your choice down in the task's
   **Notes** when you finish.
4. Run every command in the task's **Acceptance** list. Every one must pass.
5. Also run the global quality gate from repo root: `pnpm lint && pnpm typecheck && pnpm test`.
6. Update PROGRESS.md: set the task to `✅ done` and fill the date.
7. Commit with message: `feat(phase-XX): T-XX.Y <short description>` (or `fix:`/`chore:`
   when appropriate). One task = one commit (more commits are fine, fewer are not).

### 3.2 Hard rules

- **One task at a time.** Never start a task whose prerequisites are not done.
- **Never weaken the quality gate.** Do not skip, disable, or `.skip` tests; do not add
  `eslint-disable` or `@ts-ignore`/`@ts-expect-error` to make the gate pass. Fix the cause.
- **Never change the plan files to make a failing task "pass".** If a task is genuinely
  impossible as written, record it in `docs/BLOCKERS.md` (create if missing) with the task
  id, what you tried, and the exact error — then stop that task and pick the next
  unblocked one.
- **English only.** All code, comments, docs, commit messages, UI strings, and test names
  are in English.
- **Money is integer minor units.** See ARCHITECTURE.md §6. Never use floating point for
  monetary amounts.
- **Every service function gets unit tests; every API endpoint gets an integration test.**
  Numbers in DOMAIN.md (Benford frequencies, MUS factors, materiality math) must be
  asserted exactly in tests.

### 3.3 Enforcement — these rules are machine-checked, not advisory

A guard layer rejects protocol violations outright:

- **Git hooks (husky)**: `pre-commit` runs the staged-file guard + lint; `commit-msg`
  enforces the commit format and the `[plan-change]` marker; `pre-push` runs the full
  gate (guard, typecheck, test, build). CI re-runs the guard (`pnpm guard`).
- **Protected files** — CLAUDE.md, docs/PLAN.md, DOMAIN.md, ARCHITECTURE.md, DESIGN.md,
  docs/phases/**, and the guard itself (scripts/guard/**, .husky/**,
  .claude/settings.json, .github/workflows/ci.yml) — are checksummed in
  `docs/.guard/plan-manifest.json`. Any drift fails pre-commit, pre-push, and CI.
  Intentional, human-approved plan changes: run
  `node scripts/guard/update-plan-manifest.mjs` and include `[plan-change]` in the
  commit message.
- **Task graph**: PROGRESS.md must contain exactly the manifest's tasks with identical
  prerequisites, and a task may only be `✅ done` when all its prerequisites are.
- **Forbidden patterns**: `@ts-ignore`/`@ts-expect-error`, `eslint-disable`, and
  focused/skipped tests are rejected at commit time and in CI.
- **Agent harness**: a Claude Code PreToolUse hook (`.claude/settings.json`) blocks
  edits to protected files and shell commands that bypass hooks (`--no-verify`,
  `HUSKY=0`, `core.hooksPath`, force-push).
- Disabling or weakening the guard is itself a protocol violation.

### 3.4 Definition of done (every task)

- All acceptance checks in the task pass.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass from repo root.
- PROGRESS.md updated, commit created with the prescribed message format.

---

## 4. Phase overview

Phases must be completed in order. Tasks inside a phase may only run in the order listed
unless the task states otherwise.

| Phase | File | Delivers | Depends on |
|-------|------|----------|------------|
| 0 | [PHASE-00-foundation.md](./phases/PHASE-00-foundation.md) | Monorepo, tooling, CI, empty server + web apps, Prisma/SQLite | — |
| 1 | [PHASE-01-auth-and-engagements.md](./phases/PHASE-01-auth-and-engagements.md) | Users, auth, clients, engagements, audit log | 0 |
| 2 | [PHASE-02-trial-balance.md](./phases/PHASE-02-trial-balance.md) | TB import (CSV/XLSX), chart of accounts, FSLI mapping, TB views | 1 |
| 3 | [PHASE-03-journal-entries-and-leadsheets.md](./phases/PHASE-03-journal-entries-and-leadsheets.md) | AJE/RJE, adjusted TB, lead schedules | 2 |
| 4 | [PHASE-04-materiality-and-risk.md](./phases/PHASE-04-materiality-and-risk.md) | Materiality calculator, risk matrix (FSLI × assertion) | 2 |
| 5 | [PHASE-05-analytics.md](./phases/PHASE-05-analytics.md) | GL import, ratio/variance analytics, Benford, JE testing | 3 |
| 6 | [PHASE-06-sampling.md](./phases/PHASE-06-sampling.md) | Random/systematic/MUS sampling + MUS evaluation | 5 |
| 7 | [PHASE-07-working-papers.md](./phases/PHASE-07-working-papers.md) | Working paper binder, attachments, sign-offs, review notes | 4 |
| 8 | [PHASE-08-misstatements-and-reporting.md](./phases/PHASE-08-misstatements-and-reporting.md) | SUM, Excel exports, draft financial statements, archive | 6, 7 |
| 9 | [PHASE-09-packaging-and-rollforward.md](./phases/PHASE-09-packaging-and-rollforward.md) | Roll-forward, Docker, backups, E2E test, v1.0 release | 8 |

After v1.0: the Big-4 parity roadmap (Phases 10–19) lives in [PLAN-V2.md](./PLAN-V2.md).
It is a roadmap, not executable work — do not start it before v1.0 is tagged.

---

## 5. Feature parity map (why each phase exists)

| Commercial capability | Scrutiny equivalent | Phase |
|---|---|---|
| CaseWare engagement file & binder | Engagements + working paper binder | 1, 7 |
| TB import & account groupings | TB import + FSLI mapping | 2 |
| Adjusting entries & adjusted TB | AJE/RJE module | 3 |
| Materiality worksheet | Materiality calculator | 4 |
| Risk & assertion matrix | Risk module | 4 |
| IDEA / ACL data analytics | GL import, Benford, JE testing, ratios | 5 |
| IDEA sampling (MUS) | Sampling module | 6 |
| Sign-offs, review notes, lockdown | Sign-off workflow + archive | 7, 8 |
| SUM / AJE summary reports | Misstatement evaluation + Excel exports | 8 |
| Year-end roll-forward | Roll-forward | 9 |

---

## 6. Risk register (for maintainers, not a task list)

| Risk | Mitigation |
|---|---|
| Agents hallucinate audit math | All formulas pinned in DOMAIN.md with worked examples; tests assert exact values |
| Floating point money bugs | Integer minor units everywhere; lint rule + code review convention |
| Scope creep | Non-goals list above; tasks are closed-ended with acceptance checks |
| Large GL files (millions of rows) | Streaming CSV parse; SQLite with indexes; pagination on all list endpoints |
| Data loss | Archive freeze, audit log, backup task in Phase 9 |

---

## 7. License

AGPL-3.0 (set in Phase 0). Rationale: keeps hosted derivatives open. Maintainers may
change this before first public release; agents must not change it on their own.
