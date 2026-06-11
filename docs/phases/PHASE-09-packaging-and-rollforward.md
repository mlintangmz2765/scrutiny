# Phase 9 — Roll-forward, Packaging, E2E, Release

Goal: roll an engagement into the next fiscal year, ship a one-command Docker deployment,
back up data, prove the whole happy path with Playwright, and cut v1.0.

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
**Prereqs:** T-09.4
**Files:** `docs/user-guide/*.md` (getting-started, trial-balance, planning, fieldwork,
sampling, completion, exports — one page each, screenshots optional); `CHANGELOG.md`
**Steps:**
1. Write the user guide from the perspective of an auditor who has never seen the code.
2. CHANGELOG.md v1.0.0 summarizing capabilities; bump package versions to 1.0.0; tag
   `v1.0.0`.
3. Final pass: every PROGRESS.md task ✅; quality gate green; README accurate.
**Acceptance:**
- [ ] Docs build none required (plain markdown); links valid; tag created.
