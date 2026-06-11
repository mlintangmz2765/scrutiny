# Phase 8 — Misstatements, SUM, Exports, Draft FS, Archive

Goal: accumulate misstatements, evaluate the SUM against materiality, export Excel
deliverables, draft financial statements, and complete + archive the engagement.

Read first: DOMAIN.md §9 (SUM), §11 (completion & archive).

---

### T-08.1 — Misstatements & SUM domain
**Prereqs:** Phases 6 and 7 complete
**Files:** Prisma `Misstatement` + migration;
`packages/shared/src/domain/sum.ts` (+test);
`packages/shared/src/schemas/misstatement.ts`
**Steps:**
1. Model per DOMAIN.md §9: id, engagementId, description, fsliGroupId, profitEffect
   (BigInt signed), assetEffect (BigInt signed), type (`FACTUAL`|`JUDGMENTAL`|`PROJECTED`),
   status (`UNCORRECTED`|`CORRECTED`), isTrivial, journalEntryId?, sampleId?, createdById,
   timestamps.
2. `evaluateSum({items, overallMateriality, performanceMateriality, clearlyTrivial})` →
   totals by type (excluding isTrivial), |profit| and |asset| totals, and the 4-level
   conclusion per DOMAIN.md §9.
**Acceptance:**
- [ ] Unit tests: each conclusion band boundary (≤ CTT, ≤ PM, ≤ OM, > OM), trivial items
      excluded, CORRECTED excluded from uncorrected totals.

### T-08.2 — SUM API + UI
**Prereqs:** T-08.1
**Files:** `apps/server/src/modules/misstatements/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/completion/SumPage.tsx`
**Steps:**
1. CRUD under `/api/engagements/:id/misstatements`; `GET .../misstatements/evaluation`
   (400 `MATERIALITY_NOT_FINAL` when materiality not finalized);
   `POST /:mid/push-to-je` creates a PROPOSED AJE skeleton (description copied, no lines)
   linked back; marking CORRECTED requires linked JE in POSTED status (else 409
   `JE_NOT_POSTED`).
2. UI: misstatements table (struck-through trivial rows), add/edit dialog, evaluation
   card: totals by type, conclusion banner color-coded, materiality context (OM/PM/CTT).
   Sample evaluations (Phase 6) get a "record as projected misstatement" button
   (retrofit on SampleDetailPage).
**Acceptance:**
- [ ] Route tests: evaluation math, push-to-je linkage, CORRECTED guard; component test
      for conclusion banner mapping.

### T-08.3 — Excel exports
**Prereqs:** T-08.2
**Files:** `apps/server/src/modules/exports/{builders.ts,routes.ts,+tests}`
**Steps:**
1. `exceljs` builders (one function per workbook, returns Buffer):
   - **Adjusted TB**: columns code, name, FSLI, PY, unadjusted, adjustments, adjusted;
     totals row; number format `#,##0.00` scaled by minorUnitsPerMajor (amounts written
     as major-unit numbers — divide by minorUnitsPerMajor, this is display only).
   - **Lead schedule** (per FSLI, one sheet each, workbook of all): per T-03.5 columns.
   - **SUM**: misstatement list + evaluation summary block.
   - **Journal entries**: one row per line with entry header columns repeated.
2. `GET /api/engagements/:id/exports/{adjusted-tb|leadsheets|sum|journal-entries}` →
   `Content-Disposition: attachment; filename="<engagement-name>-<export>-<YYYYMMDD>.xlsx"`.
3. Export buttons on the corresponding pages.
**Acceptance:**
- [ ] Tests parse the generated buffers back with exceljs and assert cell values (totals
      cells exact) for each builder using the demo fixture data.

### T-08.4 — Draft financial statements
**Prereqs:** T-08.3
**Files:** `apps/server/src/modules/financial-statements/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/completion/DraftFsPage.tsx`
**Steps:**
1. `GET /api/engagements/:id/financial-statements` → balance sheet (FSLI groups A.*, L.*,
   E.* with subtotals: current assets approximated as A.1–A.5, non-current A.6–A.8,
   total assets, liabilities, equity, check line assets = liabilities + equity) and
   income statement (R.*, X.* with subtotals: gross profit, operating result, profit
   before tax, profit for the year) — CY adjusted vs PY, signs presented positive per
   normal balance.
2. Profit for the year must tie: BS check row exposes any imbalance explicitly (never
   hide). Include retained-earnings bridge note row: PY retained + profit = implied CY.
3. UI: statement view with PY comparatives; Excel export (add builder + endpoint,
   same pattern as T-08.3).
**Acceptance:**
- [ ] Service test on fixture: assets = liabilities + equity after a posted AJE; IS
      subtotals exact.

### T-08.5 — Completion checklist & archive
**Prereqs:** T-08.4
**Files:** Prisma `CompletionChecklistItem`, `ArchiveRecord` + migration;
`apps/server/src/modules/completion/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/completion/CompletionPage.tsx`
**Steps:**
1. Seed the 8 checklist items of DOMAIN.md §11 per engagement (on creation; retrofit
   existing). Items 1,2,3,5,6,8 are **computed** (service checks the actual condition
   live); 4 and 7 are manual checkboxes plus computed hints. `GET .../completion` returns
   each item with {satisfied, detail}.
2. `POST /api/engagements/:id/archive` (PARTNER only): verifies all items satisfied
   (else 409 `CHECKLIST_INCOMPLETE` listing failures), writes ArchiveRecord {timestamp,
   userId, sha256 of canonical adjusted-TB JSON}, sets status ARCHIVED. Replace the
   Phase 1 `ARCHIVE_VIA_COMPLETION` stub with a redirect to this flow.
3. Verify the global archivedGuard end-to-end: after archiving, a representative mutation
   in EVERY module returns 409 (write one parametrized test that loops modules).
4. UI: checklist with live status, failure details, archive button (PARTNER), archived
   banner across the engagement + all write controls disabled (read-only mode flag in
   engagement context).
**Acceptance:**
- [ ] Tests: archive blocked until all satisfied; the loop test proves read-only;
      ArchiveRecord hash stable across two reads.
