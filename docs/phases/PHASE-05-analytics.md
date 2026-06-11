# Phase 5 — Data Analytics (GL Import, Ratios, Benford, JE Testing)

Goal: import a general ledger detail file, run ratio/variance analytics, Benford analysis,
and the journal-entry-testing rules engine.

Read first: DOMAIN.md §7 (all subsections, including worked examples).

---

### T-05.1 — GL import
**Prereqs:** Phase 3 complete
**Files:** Prisma `GlImport`, `GlEntry` + migration;
`apps/server/src/modules/general-ledger/{parser.ts,service.ts,routes.ts,+tests}`;
`apps/web/src/pages/analytics/GlImportPage.tsx`;
`fixtures/gl-valid.csv` (≥ 500 rows, generated deterministically — commit the file, not a
generator), `fixtures/gl-bad-rows.csv`
**Steps:**
1. `GlEntry`: id, importId, engagementId, documentNo, postingDate, accountCode,
   description, amount (BigInt signed), postedBy, raw (JSON string). Index on
   (engagementId, accountCode), (engagementId, postingDate), (engagementId, documentNo).
2. Streaming CSV parse (`csv-parse` stream API; XLSX may load whole file — documented
   limit 50 MB). Same columnMap pattern as T-02.2 (signed amount or debit/credit).
   Insert in batches of 1,000 inside a transaction per batch.
3. Endpoints under `/api/engagements/:id/general-ledger`: `POST /preview`,
   `POST /import` (replaces previous import after confirm), `GET /` (metadata + row
   count + totals), `GET /entries` (paginated, filter by account/date range/search).
4. Validation report (not blocking import, returned as warnings): rows whose accountCode
   is not in the engagement chart of accounts; documents that don't sum to zero (these
   feed `UNBALANCED_DOC` rule later).
5. UI: upload wizard like TB import + entries browser table with filters.
**Acceptance:**
- [ ] Import of `gl-valid.csv` persists exact row count and net total 0; bad-rows fixture
      surfaces warnings; pagination + filters tested.

### T-05.2 — Ratio & variance analytics
**Prereqs:** T-05.1 (for nav placement only; math uses TB) — may start after Phase 4
**Files:** `packages/shared/src/domain/ratios.ts` (+test);
`apps/server/src/modules/analytics/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/analytics/AnalyticsDashboardPage.tsx`
**Steps:**
1. `computeRatios(fsliTotals)` implementing every ratio in DOMAIN.md §7.1, null-safe.
   Input: map of FSLI code → signed adjusted total (minor units); function normalizes
   signs (abs of natural-credit groups) before applying formulas.
2. Variance per DOMAIN.md §7.2 (thresholds from engagement settings; defaults PM and 10%).
3. Endpoint `GET /api/engagements/:id/analytics/overview` → ratios (CY and PY where PY TB
   exists) + variance rows with flags.
4. UI dashboard: ratio cards (CY value, PY value, trend arrow), variance table with
   flagged rows highlighted, link to each FSLI leadsheet.
**Acceptance:**
- [ ] Unit tests: each ratio with hand-computed values from a small fixture map; division
      by zero → null; route test for overview shape.

### T-05.3 — Benford analysis
**Prereqs:** T-05.1
**Files:** `packages/shared/src/domain/benford.ts` (+test);
endpoint in analytics module; `apps/web/src/pages/analytics/BenfordPage.tsx`
**Steps:**
1. `benfordFirstDigit(amounts: number[])` → per-digit observed/expected counts and
   proportions, χ², MAD, conformity label per DOMAIN.md §7.3 (exact expected table,
   thresholds, exclusion rule |amount| < 10).
2. `GET /api/engagements/:id/analytics/benford` runs over all GL entry amounts (stream
   account-filtered optionally via `?accountCode=`).
3. UI: bar chart (Recharts) observed vs expected, χ²/MAD stats, conformity badge,
   per-digit drill-down table; clicking a digit lists top 50 matching entries.
**Acceptance:**
- [ ] Unit test asserts the DOMAIN.md worked example exactly (MAD 0.01175 ±1e-5,
      χ² 13.659 ±0.01, label "acceptable"); empty population → 400 `BENFORD_EMPTY`.

### T-05.4 — JE testing rules engine
**Prereqs:** T-05.1
**Files:** `apps/server/src/modules/je-testing/{rules.ts,service.ts,routes.ts,+tests}`;
Prisma `JeTestRun`, `JeTestFinding` + migration;
`packages/shared/src/schemas/je-testing.ts`
**Steps:**
1. Each rule = `{id, run(entries|queries, params) → findings}` per DOMAIN.md §7.4 table.
   Implement all 8 rules. SQL-side filtering where possible (date, amount, modulo via
   fetched pages is fine — correctness over cleverness; must handle 1M rows without
   loading all into memory: process in pages of 10,000 for JS-side rules).
2. `POST /api/engagements/:id/je-testing/runs {rules: [{id, params?}...]}` → creates run,
   executes synchronously, persists findings {ruleId, glEntryId, reason}. `GET /runs`,
   `GET /runs/:runId/findings` (paginated, filter by rule).
3. `LARGE_AMOUNT` default threshold = performance materiality (400 `MATERIALITY_NOT_FINAL`
   if rule requested without explicit threshold and materiality not finalized).
**Acceptance:**
- [ ] Per-rule unit tests with crafted fixtures (each rule: ≥1 hit and ≥1 non-hit case);
      weekend rule tested across month boundary; run endpoint persists and re-lists.

### T-05.5 — JE testing UI
**Prereqs:** T-05.4
**Files:** `apps/web/src/pages/analytics/JeTestingPage.tsx`
**Steps:**
1. Rule picker with param inputs (defaults prefilled), run button with progress state,
   results: per-rule counts, findings grid (document, date, account, amount, reason),
   CSV export of findings (client-side), past runs list.
**Acceptance:**
- [ ] Component test: selecting rules builds correct request payload.
- [ ] Manual: run all rules on demo GL, review findings.
