# Phase 4 — Materiality & Risk Assessment

Goal: materiality worksheet with computed thresholds; risk matrix per FSLI × assertion
with derived RMM; planning-analytics risk suggestions.

Read first: DOMAIN.md §5 (materiality, worked example), §6 (RMM matrix), §7.2.

---

### T-04.1 — Materiality domain function
**Prereqs:** T-00.2 (can run parallel to Phase 3 after T-02.7)
**Files:** `packages/shared/src/domain/materiality.ts` (+test),
`packages/shared/src/schemas/materiality.ts`
**Steps:**
1. `computeMateriality({benchmark, benchmarkAmount, benchmarkPct, pmPct, cttPct})` →
   `{overallMateriality, performanceMateriality, clearlyTrivialThreshold}` exactly per
   DOMAIN.md §5 (rounding helper, range validation throws `RangeError` with the offending
   field name).
2. Export the benchmark default/range table as a const for the UI.
**Acceptance:**
- [ ] Tests assert the DOMAIN.md worked example exactly (617,284 / 462,963 / 30,864),
      every range boundary (min ok, below min throws, max ok, above max throws), and
      benchmarkAmount ≤ 0 throws.

### T-04.2 — Materiality API + UI
**Prereqs:** T-04.1, T-01.8
**Files:** Prisma `Materiality` + migration;
`apps/server/src/modules/materiality/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/planning/MaterialityPage.tsx`
**Steps:**
1. Model: one row per engagement (upsert), stores inputs AND computed outputs (computed
   server-side via the domain function — client values ignored), `isFinal` boolean,
   `finalizedById/At`. While `isFinal`, updates → 409 `MATERIALITY_FINAL` (MANAGER+ may
   un-finalize before archive).
2. `GET/PUT /api/engagements/:id/materiality`; `POST .../materiality/finalize` (MANAGER+).
3. UI: form with benchmark select (showing default % and allowed range hints), amount
   input (major units with currency formatting — converted to minor units on submit),
   live computed preview (using the shared domain function client-side), finalize button
   + finalized banner.
**Acceptance:**
- [ ] Route tests: PUT recomputes server-side even if client sends bogus outputs;
      finalize locks; un-finalize unlocks; out-of-range 400.
- [ ] Manual: set materiality on the demo engagement and finalize.

### T-04.3 — Risk model & API
**Prereqs:** T-04.2
**Files:** Prisma `RiskAssessment` + migration;
`packages/shared/src/domain/risk.ts` (+test);
`apps/server/src/modules/risks/{service.ts,routes.ts,+tests}`
**Steps:**
1. `deriveRmm(inherent, control)` implementing the DOMAIN.md §6 matrix (unit test all 9
   cells).
2. Model: id, engagementId, fsliGroupId, assertion, inherentRisk?, controlRisk?, rmm?
   (server-derived), isSignificantRisk, plannedResponse?, unique(engagementId,
   fsliGroupId, assertion).
3. Endpoints: `GET /api/engagements/:id/risks` (full grid: every FSLI × 8 assertions,
   assessed or empty), `PUT /api/engagements/:id/risks` (bulk upsert; rmm always derived
   server-side).
**Acceptance:**
- [ ] Tests: all 9 matrix cells; bulk upsert idempotent; grid endpoint returns
      24 FSLI × 8 assertions entries.

### T-04.4 — Risk UI
**Prereqs:** T-04.3
**Files:** `apps/web/src/pages/planning/RiskMatrixPage.tsx`
**Steps:**
1. Grid: rows = FSLI (only those with mapped accounts highlighted; others collapsed
   under "show all"), columns = assertions; cell shows RMM color (green/amber/red) and
   opens an editor popover (IR, CR, significant, response). Bulk save. Summary bar:
   counts of HIGH RMM and significant risks.
**Acceptance:**
- [ ] Component test: editing a cell updates derived RMM color from the matrix.
- [ ] Manual: assess 3 cells on demo engagement.

### T-04.5 — Planning analytics suggestions
**Prereqs:** T-04.3 and Phase 3 complete (uses adjusted summary)
**Files:** `apps/server/src/modules/risks/suggestions.ts` (+test), wire into
`GET .../risks?includeSuggestions=true`; UI banner on RiskMatrixPage
**Steps:**
1. Per DOMAIN.md §6 last bullet: FSLIs with |adjusted CY − PY| > performance materiality →
   suggestion list (fsliCode, delta, deltaPct). Requires finalized materiality; otherwise
   return empty with `reason: "MATERIALITY_NOT_FINAL"`.
2. UI: banner "N FSLIs moved more than performance materiality" with per-row "assess"
   shortcut that focuses the grid row.
**Acceptance:**
- [ ] Test with fixture TB + a large posted AJE produces the expected suggestion set.
