# Phase 14 — Data Acquisition & Population-Scale Analytics

Goal: Helix/Halo-class capability — ERP extraction kits, a columnar engine beside the
OLTP store, full-population JE scoring, subledger/revenue analytics, ISA 520
substantive analytics — every run documenting itself as a working paper.

Read first: DOMAIN-V2.md §4–§7 (all formulas — implement exactly); DOMAIN.md §7.

---

### T-14.1 — DuckDB sidecar & Parquet lake
**Prereqs:** T-10.8
**Files:** `apps/server/src/analytics/{duck.ts,lake.ts,+tests}`; job handler
`jobs/handlers/gl-to-parquet.ts`; deps `duckdb` (node bindings)
**Steps:**
1. Lake layout: `data/analytics/<engagementId>/gl.parquet` (+ later
   `subledger-*.parquet`). `duck.ts` owns a lazily-opened DuckDB connection helper
   with query timeouts; OLTP tables are never written by analytics code.
2. Ingest job: after a GL import commits, enqueue conversion — stream GlEntry rows
   in 50k batches into Parquet (columns: id, documentNo, postingDate, accountCode,
   description, amount, postedBy, plus derived weekday/hour).
3. Parity check inside the job: DuckDB `count(*)` and `sum(amount)` must equal the
   OLTP values or the job fails loudly (no silent partial lakes).
4. Synthetic generator util (test-only) producing N deterministic entries (seeded).
**Acceptance:**
- [ ] Test: 1,000,000 synthetic rows ingest with exact count/sum parity; re-ingest
      replaces the file atomically; corrupted-lake detection (tampered file → parity
      job failure) tested.

### T-14.2 — ERP extraction kits
**Prereqs:** T-14.1
**Files:** `apps/server/src/modules/general-ledger/adapters/{sap.ts,oracle.ts,dynamics.ts,netsuite.ts,accurate.ts,+tests}`;
fixtures `fixtures/erp/*.csv`; `docs/user-guide/erp-extraction.md`
**Steps:**
1. Each adapter = a named columnMap preset + row normalizer onto the canonical
   GlEntry shape (T-05.1), handling that ERP's export quirks (SAP BKPF/BSEG join
   export as single CSV spec, Oracle GL_JE_LINES export, Dynamics GL entries export,
   NetSuite transaction export, Accurate GL export — each documented with the exact
   expected column headers in the user guide).
2. One ≥ 200-row realistic fixture per format (balanced documents, mixed signs,
   localized decimal commas where typical). Import UI gains a "source system" preset
   dropdown that applies the adapter.
3. Unknown-format fallback stays the manual columnMap (v1 path unchanged).
**Acceptance:**
- [ ] Adapter tests: exact row counts, exact minor-unit amounts for ≥ 3 rows per
      fixture, document balance warnings surfaced; preset dropdown wired (component
      test asserts payload contains adapter id).

### T-14.3 — Large-import hardening & progress
**Prereqs:** T-14.2
**Files:** GL import service retrofit (+tests); `apps/server/src/jobs/handlers/gl-import.ts`;
progress endpoint; web import UI progress state
**Steps:**
1. Move commit-phase GL imports into a background job (upload stores the raw file
   via the storage driver; job parses/inserts in 10k batches, updating
   `GlImport.progressPct` and `rowsProcessed`).
2. Streaming XLSX via exceljs streaming reader (removes the 50 MB v1 note; new cap
   500 MB). CSV already streams.
3. `GET .../general-ledger/imports/:id/progress`; web polls and renders a progress
   bar; failure states surface the job error.
**Acceptance:**
- [ ] Test: 500k-row synthetic CSV imports via the job with monotonically increasing
      progress and exact final counts; mid-file corruption fails the job with a row
      number in the error; UI component test for progress rendering.

### T-14.4 — Composite JE risk scoring engine
**Prereqs:** T-14.3
**Files:** `packages/shared/src/domain/je-score.ts` (+test);
`apps/server/src/analytics/{je-scoring.ts,+tests}`; Prisma `AnalyticRun`,
`JeScoreResult` + migration; job handler
**Steps:**
1. Pure function `scoreEntry(features) → {score, reasons[]}` per DOMAIN-V2 §4
   (weights table as exported const; cap 100). Unit tests assert the worked examples
   exactly (45 and 100) plus each feature in isolation.
2. Feature extraction in DuckDB SQL over the lake (user counts, account counts,
   weekday/hour, thresholds — approval threshold + PM passed as params; PM requires
   finalized materiality else 400 `MATERIALITY_NOT_FINAL`).
3. `AnalyticRun` (generic for this phase): id, engagementId, kind, params JSON,
   status, startedAt/finishedAt, summary JSON, workingPaperId?. `JeScoreResult`
   stores per-entry score + reasons for entries with score ≥ storeThreshold
   (param, default 20) — never the full population in OLTP.
4. `POST /api/engagements/:id/analytics/je-score` (enqueue), results endpoints
   (paginated, filter by score band/feature).
**Acceptance:**
- [ ] Domain worked-example tests exact; engine test on a crafted 10k population
      yields exact score distribution counts; PM gate; run persists summary
      (population, scored, ≥40 count).

### T-14.5 — Scoring UI
**Prereqs:** T-14.4
**Files:** `apps/web/src/pages/analytics/JeScorePage.tsx` (+component test)
**Steps:**
1. Run launcher (params with defaults), run history, score distribution bar chart
   (Recharts, bands 0–19/20–39/40–59/60–79/80–100), threshold slider filtering the
   results grid (entry, date, amount, score, reason chips).
2. Row actions: "add to MUS population filter" (deep-link to Phase 6 wizard with
   document filter) and "link to working paper" (Phase 7 links).
**Acceptance:**
- [ ] Component tests: band chart receives correct buckets from mocked results;
      threshold filter narrows rows. Manual run on demo GL documented in Notes.

### T-14.6 — Subledger analytics (AR/AP)
**Prereqs:** T-14.5
**Files:** `packages/shared/src/domain/subledger.ts` (+test);
`apps/server/src/analytics/{subledger.ts,+tests}`; import path for open-items CSV;
`apps/web/src/pages/analytics/SubledgerPage.tsx`
**Steps:**
1. Open-items import (AR and AP): CSV (counterparty, documentNo, docDate, dueDate?,
   amount) → Parquet per engagement; same preview/commit pattern as v1 imports.
2. Domain functions per DOMAIN-V2 §5: `ageBuckets(items, asOf)` (exact bucket
   edges), `monthlyDso(arByMonth, revenueByMonth, daysInMonth)` (null on zero
   revenue), `duplicatePaymentCandidates(payments)` (exact rule — test the §5
   worked example: flagged pair and unflagged 45-day pair).
3. Runs persisted as AnalyticRun kinds `AR_AGING`, `DSO_TREND`, `AP_DUPLICATES` with
   summary JSON; endpoints + UI page (aging table, DSO line chart, duplicates grid
   with pair grouping).
**Acceptance:**
- [ ] Domain tests: bucket boundary values (30/31, 60/61, 90/91 days), DSO nulls,
      duplicate worked example exact; run endpoints paginated; aging totals equal
      imported totals.

### T-14.7 — Revenue analytics
**Prereqs:** T-14.6
**Files:** `packages/shared/src/domain/revenue-analytics.ts` (+test);
`apps/server/src/analytics/revenue.ts` (+tests); UI section on AnalyticsDashboard
**Steps:**
1. Cutoff population per DOMAIN-V2 §6: revenue-account entries (mapped FSLI R.1)
   within ±window of periodEnd, split before/after; params {windowDays: 7}.
2. Credit-note ratio monthly series + median-based flags per §6 (credit notes =
   debit entries on R.1 accounts, i.e. sign-based).
3. Runs `REVENUE_CUTOFF`, `CREDIT_NOTES` persisted; dashboard cards + drill-down
   grids; both link entries to WP/sample flows like T-14.5.
**Acceptance:**
- [ ] Domain tests: window boundary (day 7 in, day 8 out both sides), ratio flags on
      a crafted 12-month series (exact months flagged); endpoint shape tests.

### T-14.8 — Substantive analytics workbench (ISA 520)
**Prereqs:** T-14.7
**Files:** `packages/shared/src/domain/regression.ts` (+test);
`apps/server/src/analytics/expectation.ts` (+tests);
`apps/web/src/pages/analytics/ExpectationPage.tsx`
**Steps:**
1. OLS + precision math exactly per DOMAIN-V2 §7 (t-table as const). Unit tests
   assert both worked examples to the stated tolerances.
2. Workbench flow: pick target series (monthly FSLI totals from GL by mapped
   accounts), training range (≥12 prior months — pulls PY GL when imported, else
   blocks with a clear message), compute expectation vs actual per month, threshold
   = min(P, PM), investigation list.
3. Persist as run kind `EXPECTATION`; UI: scatter + fitted line + threshold band
   (Recharts), month table with investigate flags, conclusion text box.
**Acceptance:**
- [ ] Both DOMAIN-V2 §7 fixtures asserted in domain tests; service test: crafted 24
      months yields exact flagged months; PM gate enforced.

### T-14.9 — Analytics auto-documentation
**Prereqs:** T-14.8
**Files:** `apps/server/src/analytics/{document-run.ts,+tests}`; retrofit all Phase 14
run kinds + v1 Benford/JE-testing runs
**Steps:**
1. `documentRun(runId)` renders a working paper (markdown: purpose, params, data
   population hashes, summary tables, exceptions list placeholder, conclusion
   placeholder) in the analytics section (`B` planning or per-FSLI where targeted),
   links run ↔ WP (Phase 7 links), sets `AnalyticRun.workingPaperId`.
2. Auto-invoked on run completion (job tail); re-running documents a NEW WP version
   note rather than editing a signed one (respects sign-off reset rules).
3. Retrofit v1 Benford + JE-testing runs to the AnalyticRun umbrella (migration
   mapping old rows) so they document identically.
**Acceptance:**
- [ ] Tests: WP body contains exact params + summary figures for a fixture run;
      signed WP is never mutated (new WP created); v1 runs migrated and documented.

### T-14.10 — Performance acceptance & benchmark harness
**Prereqs:** T-14.9
**Files:** `scripts/perf/analytics-bench.mjs`; CI perf-lite step; `docs/user-guide/analytics.md`
**Steps:**
1. Bench harness: generates 1M (CI) / 100M (documented local, flag) synthetic
   entries, runs ingest + JE scoring + one expectation model, reports wall times and
   peak RSS; thresholds: CI 1M ingest+score < 3 min; local 100M documented target
   < 60 min on 16 GB (record actuals in Notes and the user guide).
2. CI job (separate, non-matrix) runs the 1M bench and fails over threshold.
3. User guide: capacity table, tuning knobs (batch sizes, DuckDB memory limit).
**Acceptance:**
- [ ] CI bench green with thresholds; guide includes the measured table; harness
      deterministic (seeded) so numbers are comparable run-to-run.
