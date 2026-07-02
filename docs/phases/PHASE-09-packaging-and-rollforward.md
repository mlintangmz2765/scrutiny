# Phase 9 — Roll-forward, Packaging, E2E, Release

Goal: roll an engagement into the next fiscal year, ship a one-command Docker deployment,
back up data, prove the whole happy path with Playwright, seed a built-in practice company with
a student workbook and self-check key so auditing students can practice end to end, and cut v1.0.

Read first: DOMAIN.md §12; ARCHITECTURE.md §3 (static serving note).

---

### T-09.1 — Roll-forward
**Prereqs:** Phase 8 complete
**Files:** `apps/server/src/modules/roll-forward/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/engagements/RollForwardDialog.tsx`
**Steps:**
1. `POST /api/engagements/:id/roll-forward {name, periodStart, periodEnd}` — source must
   be ARCHIVED (else 409 `SOURCE_NOT_ARCHIVED`). Creates the new engagement and copies
   exactly the items in DOMAIN.md §12, in one transaction:
   - chart of accounts + FSLI mappings;
   - PRIOR TB import for the new engagement synthesized from the source's **final
     adjusted balances** (kind=PRIOR, fileName "rollforward");
   - binder structure (refs/titles/sections/requiresPartnerSignoff; empty bodies, no
     sign-offs/notes/attachments/links);
   - risk grid shape with blank assessments; fresh completion checklist; members copied.
   - NOT copied: JEs, GL, samples, misstatements, materiality, audit log.
2. UI: "Roll forward" button on archived engagement overview → dialog → navigates to the
   new engagement.
**Acceptance:**
- [ ] Test: roll an archived fixture engagement; assert PY balances equal source adjusted
      balances exactly; assert the NOT-copied list is empty in the new engagement;
      non-archived source rejected.

### T-09.2 — Docker & static serving
**Prereqs:** T-09.1
**Files:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`;
`apps/server/src/plugins/static.ts`
**Steps:**
1. Server serves `apps/web/dist` via `@fastify/static` with SPA fallback (non-/api GETs →
   index.html) when `SERVE_WEB=true`.
2. Multi-stage Dockerfile: pnpm install → build all → prune to production deps → runtime
   image (node:22-slim) running migrations (`prisma migrate deploy`) then the server.
   Volume mount for `/app/data`. Compose file: one service, port 3001, named volume,
   `JWT_SECRET` required.
3. Document in README: `docker compose up` quickstart + first-login credentials warning.
**Acceptance:**
- [ ] `docker compose up --build` (or documented equivalent) serves the app on :3001,
      data survives container recreation. If Docker is unavailable in the execution
      environment, record in BLOCKERS.md and verify the static-serving plugin with an
      integration test (`SERVE_WEB=true` + built web assets) instead.

### T-09.3 — Backups & ops docs
**Prereqs:** T-09.2
**Files:** `apps/server/src/modules/admin/{routes.ts,+tests}`; `docs/user-guide/ops.md`
**Steps:**
1. `POST /api/admin/backup` (ADMIN): SQLite `VACUUM INTO` a timestamped file under
   `data/backups/`, returns file name + size; `GET /api/admin/backups` lists them.
   (Restore = documented manual file copy; no restore endpoint.)
2. Ops doc: backup/restore, upgrade (pull + migrate), env vars table, file locations.
**Acceptance:**
- [ ] Test: backup file is a valid SQLite db (open it and count User rows).

### T-09.4 — Playwright E2E happy path
**Prereqs:** T-09.3
**Files:** `e2e/` package (playwright config + specs), root script `test:e2e`, CI job
(separate workflow job, non-blocking allowed initially)
**Steps:**
1. Spec covering PLAN.md §2 end to end against a freshly seeded server + built web:
   login → create client + engagement → import `fixtures/tb-valid.csv` → map all (apply
   suggestions) → finalize materiality → assess one risk → post one AJE → import GL →
   run JE testing → MUS sample lifecycle → record projected misstatement → sign off the
   touched WPs → clear notes → complete checklist → archive → export adjusted TB (assert
   download) → roll forward.
2. Keep ONE long spec (ordered) + a tiny smoke spec; use data-testid attributes added
   where selectors are brittle.
**Acceptance:**
- [ ] `pnpm test:e2e` green locally from a clean db (script resets db first).

### T-09.5 — User guide & v1.0 release
**Prereqs:** T-09.4, T-09.8
**Files:** `docs/user-guide/*.md` (getting-started, trial-balance, planning, fieldwork,
sampling, completion, exports — one page each, screenshots optional); `CHANGELOG.md`
**Steps:**
1. Write the user guide from the perspective of an auditor who has never seen the code.
2. CHANGELOG.md v1.0.0 summarizing capabilities; bump package versions to 1.0.0; tag
   `v1.0.0`.
3. Final pass: every Phase 0–9 task ✅ (Phases 10+ are the post-v1.0 roadmap); quality gate
   green; README accurate.
**Acceptance:**
- [ ] Docs build none required (plain markdown); links valid; tag created.

### T-09.6 — Practice company dataset & seed
**Prereqs:** T-09.1
**Files:** `fixtures/practice/{trial-balance.csv,general-ledger.csv,prior-year-tb.csv}`;
`apps/server/prisma/seed-practice.ts`; Prisma `Engagement.isPractice Boolean @default(false)`
+ migration; root script `db:seed:practice`; `docs/user-guide/practice-mode.md`
**Steps:**
1. Build committed fixtures for a fictional company ("Meridian Trading Co."): a **balanced**
   current-year TB, a prior-year TB, and a GL of a few thousand lines. Choose the
   profit-before-tax benchmark so materiality equals DOMAIN.md's pinned worked example
   **exactly** (overall 617,284 / performance 462,963 / clearly trivial 30,864) — this ties the
   dataset to the T-09.8 self-check key. Seed the GL with the anomalies DOMAIN.md's
   Benford / JE-testing examples expect (digit distribution reproducing MAD 0.01175 and
   χ² 13.659; round-number, weekend, and after-hours postings) so analytics produce the
   documented findings.
2. Add `isPractice` to `Engagement` (migration). `seed-practice.ts` is idempotent (guard on a
   fixed practice client name): create an instructor (PARTNER) and a student (STAFF) user with
   clearly-labeled demo credentials, a practice client + engagement with `isPractice=true`, then
   import the TB and GL **through the real import / GL services** (never raw inserts). Leave all
   student work UNSTARTED — no mapping, materiality, risk, JEs, samples, or sign-offs.
3. Wire `pnpm db:seed:practice` (separate from the production `db:seed`; never auto-runs).
   Document what it creates and the demo logins in `practice-mode.md`.
**Acceptance:**
- [ ] Test: seeding into a fresh db creates a practice engagement whose TB is balanced and whose
      GL row count exceeds the analytics minimum; re-running the seed does not duplicate; mapping,
      materiality, risk, JEs, and samples are all empty (student work not pre-done).
- [ ] Test: `computeMateriality` on the seeded benchmark returns DOMAIN.md's pinned values
      exactly (locks the dataset to the answer key).

### T-09.7 — Practice reset & sandbox safeguards
**Prereqs:** T-09.6
**Files:** `apps/server/src/modules/practice/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/engagements/ResetPracticeDialog.tsx` + a "Practice / sandbox" badge
**Steps:**
1. `POST /api/engagements/:id/reset-practice` (ADMIN or engagement PARTNER): allowed **only**
   when `isPractice=true` (else 409 `NOT_A_PRACTICE_ENGAGEMENT`). In one transaction, delete all
   student work (FSLI mappings, JEs, materiality, risk assessments, samples, misstatements / SUM,
   sign-offs, review notes, attachments) and re-import the pristine TB + GL, returning the
   engagement to its just-seeded state. `archivedGuard` still applies; write an audit-log entry.
2. Web: on a practice engagement show a visible "Practice / sandbox" badge (DESIGN.md tokens) and
   a "Reset practice engagement" action behind a confirm dialog; hide both on non-practice
   engagements.
**Acceptance:**
- [ ] Test: reset on a practice engagement clears every listed work item and restores the TB + GL
      to seed state; reset on a non-practice engagement is rejected with
      `NOT_A_PRACTICE_ENGAGEMENT`; an audit-log entry is written.

### T-09.8 — Student workbook & self-check key
**Prereqs:** T-09.7, T-09.4
**Files:** `docs/user-guide/student-workbook.md`, `docs/user-guide/self-check-key.md`; README
"For students / classroom use" section
**Steps:**
1. Write a student-facing workbook that walks the whole audit on the seeded practice company at a
   learner's level. For each stage (TB import & mapping → materiality → risk → AJEs & adjusted TB
   → ratio/variance analytics, Benford, JE testing → MUS sampling → SUM → sign-off & archive →
   roll-forward) state **what** it is, **why** it matters (cite the governing ISA), and the exact
   steps in the UI. Keep it self-contained (link the auditor user guide where useful, but do not
   depend on it).
2. Write a self-check answer key populated **only** from DOMAIN.md's pinned worked examples
   (materiality 617,284 / 462,963 / 30,864; Benford MAD 0.01175, χ² 13.659; MUS interval 216,450,
   n=47; projected 324,675, UML 824,675) so a student can verify each computed result. Label it
   clearly as instructor / self-check content.
3. Add a "For students / classroom use" section to README pointing at `practice-mode.md`,
   `db:seed:practice`, and the workbook.
**Acceptance:**
- [ ] Every self-check number matches DOMAIN.md exactly (cross-checked; the domain unit tests are
      the source of truth for those values); all markdown links resolve.
