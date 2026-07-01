# Phase 16 — Group Audits & Multi-Currency

Goal: orchestrate an ISA 600 (Revised) group audit — components, scoping, materiality
allocation, instructions, component reporting, consolidation with translation and
eliminations, group-level evaluation.

Read first: DOMAIN-V2.md §9 (FX/CTA — exact math), §10 (significance & allocation),
§11 (group evaluation); DOMAIN.md §5, §9.

---

### T-16.1 — Multi-currency foundation & translation math
**Prereqs:** T-14.10, T-15.7
**Files:** `packages/shared/src/domain/fx.ts` (+test); Prisma `FxRate` + migration;
Engagement column `isGroup Boolean @default(false)`;
`apps/server/src/modules/fx/{service.ts,routes.ts,+tests}`
**Steps:**
1. `FxRate`: id, engagementId, currencyCode, rateType (`CLOSING`|`AVERAGE`|
   `HISTORICAL`), rate (Decimal stored as scaled BigInt: rate × 10^8 — document the
   scale; helpers in fx.ts), label? (for historical items), unique(engagementId,
   currencyCode, rateType, label).
2. `translateTrialBalance(lines, rates)` per DOMAIN-V2 §9: BS at closing, IS at
   average, tagged equity lines at historical; returns translated lines + CTA plug.
   Unit tests assert the §9 worked example exactly (CTA = 335 credit, equity ties).
3. Rates CRUD endpoints (LEAD, archivedGuard); validation: required rate types
   present before translation runs.
**Acceptance:**
- [ ] Worked example exact in domain tests incl. tie assertion; missing-rate error
      lists which rates; scaled-rate helpers round only via roundHalfAwayFromZero.

### T-16.2 — Translated views & exports
**Prereqs:** T-16.1
**Files:** TB report service retrofit (+tests); leadsheet/export retrofits;
`apps/web/src/pages/trial-balance/*` currency toggle
**Steps:**
1. Engagements with a reportingCurrency ≠ currencyCode expose `?currency=reporting`
   on TB report/summary/leadsheets: translated figures + a CTA equity line
   (presented under E.3); totals still net to zero (test).
2. Excel exports (Phase 8) gain the translated variant with a rates footnote sheet.
3. UI: currency toggle on TB/adjusted TB/leadsheets; CTA row styled like totals.
**Acceptance:**
- [ ] Report tests: translated totals zero-net, CTA equals domain function output;
      export sheet contains the rates table; toggle component test.

### T-16.3 — Component registry & scoping
**Prereqs:** T-16.2
**Files:** Prisma `Component` + migration;
`apps/server/src/modules/group/{components-service.ts,routes.ts,+tests}`;
`apps/web/src/pages/group/ComponentsPage.tsx`
**Steps:**
1. `Component`: id, groupEngagementId, name, jurisdiction, currencyCode,
   benchmarkAmount (BigInt), significance (`SIGNIFICANT`|`SPECIFIC`|`NONE`, derived —
   stored with derivation inputs), linkedEngagementId? (a component may be audited in
   its own Scrutiny engagement), assignedFirm? (text, for external component
   auditors), componentMateriality? (set in T-16.4).
2. Significance derivation per DOMAIN-V2 §10 thresholds (params on the group
   engagement: significantSharePct default 0.15, specificSharePct default 0.05;
   manual override with reason, audit-logged).
3. Endpoints under `/api/engagements/:id/group/components` (404 unless isGroup);
   CRUD (LEAD), scoping summary (counts + coverage % of group benchmark).
4. UI: components table with shares, significance badges, override dialog.
**Acceptance:**
- [ ] Derivation tests at threshold boundaries (0.05/0.15 exact edges); override
      requires reason; non-group engagement 404; coverage math asserted.

### T-16.4 — Component materiality allocator
**Prereqs:** T-16.3
**Files:** `packages/shared/src/domain/component-materiality.ts` (+test);
service/endpoint; `apps/web/src/pages/group/ComponentMaterialityPage.tsx`
**Steps:**
1. Implement DOMAIN-V2 §10 formula exactly (cap, sqrt allocation, floor); requires
   finalized group materiality. Unit tests assert all three worked-example values.
2. `POST .../group/components/materiality/compute` fills componentMateriality for
   all components (LEAD; recompute allowed until group materiality re-finalized);
   manual per-component override with reason (never above the cap — 400).
3. Worksheet UI: table (share, computed CM, override, effective CM), totals row,
   materiality context header.
**Acceptance:**
- [ ] Worked examples exact; cap enforcement on override; recompute idempotent;
      route/role/guard tests.

### T-16.5 — Group instructions & component workspace
**Prereqs:** T-16.4
**Files:** Prisma `InstructionPackage`, `InstructionDeliverable`, `ComponentAuditor`
+ migration; `apps/server/src/modules/group/{instructions-service.ts,portal-routes.ts,+tests}`;
web pages (firm: InstructionsPage; portal: component workspace)
**Steps:**
1. `InstructionPackage`: id, componentId, title, body (markdown), issuedAt,
   dueDate, status (`DRAFT`|`ISSUED`|`RESPONDED`|`CLEARED`). `InstructionDeliverable`:
   id, packageId, name, required, uploadedFileId?, uploadedAt?.
   `ComponentAuditor`: external identity scoped to ONE component (reuses the T-12.1
   external-auth mechanics with audience `component`; same isolation rules).
2. Firm side: author/issue packages (template body seeded: scope, CM, deadlines,
   reporting requirements with placeholders from T-16.4 values); track status.
3. Component workspace (`/portal` variant, `/api/component/*`): view package,
   upload deliverables, submit clearance → package RESPONDED.
**Acceptance:**
- [ ] Isolation tests: component auditor sees only their component (cross-component
      404), audiences don't cross; placeholder resolution exact; deliverable
      completeness computed (all required uploaded → RESPONDED allowed, else 400).

### T-16.6 — Component reporting & clearance
**Prereqs:** T-16.5
**Files:** Prisma `ClearanceMemo` + migration; group module service/routes/tests;
`apps/web/src/pages/group/ComponentReportingPage.tsx`
**Steps:**
1. `ClearanceMemo` (structured form, one per package): conclusion (`UNQUALIFIED`|
   `EXCEPTIONS`), summaryText, uncorrectedMisstatements JSON rows {description,
   profitEffect, assetEffect} in component currency, signedByName, submittedAt.
   Submitted by the component auditor OR entered firm-side for offline components.
2. Firm review: accept memo → package CLEARED (LEAD); rejection returns RESPONDED
   with a comment.
3. Rollup dashboard: per-component status matrix (instructions, deliverables, memo,
   cleared), overdue highlights.
**Acceptance:**
- [ ] Memo validation (EXCEPTIONS requires rows), accept/reject cycle, rollup counts
      exact on fixtures; audit log rows for clearance decisions.

### T-16.7 — Consolidation & eliminations
**Prereqs:** T-16.6
**Files:** `apps/server/src/modules/group/{consolidation-service.ts,+tests}`;
JE type extension (`ELIM`); `apps/web/src/pages/group/ConsolidationPage.tsx`
**Steps:**
1. Component final TBs: from linkedEngagement (adjusted balances) or uploaded
   mapped TB (v1 import pipeline reused, kind `COMPONENT`); translated per T-16.1
   using component-currency rates; mapped onto group FSLI.
2. `ELIM` journal entries (group engagement only): same lifecycle as v1 JEs;
   consolidation view = Σ parent + components + ELIM per FSLI with per-column
   drill-down; must net to zero with CTA rows (test).
3. Consolidated draft FS: Phase 8 draft-FS service accepts the consolidated dataset;
   Phase 15 bindings gain source `GROUP_FSLI`.
**Acceptance:**
- [ ] Consolidated totals tie (assets = liabilities + equity incl. CTA) on a
      two-component fixture with one elimination; drill-down sums equal column
      totals; ELIM entries blocked on non-group engagements.

### T-16.8 — Group evaluation & archive gating
**Prereqs:** T-16.7
**Files:** `packages/shared/src/domain/group-evaluation.ts` (+test); completion
retrofit; `apps/web/src/pages/group/GroupEvaluationPage.tsx`; roll-forward retrofit
**Steps:**
1. Group SUM per DOMAIN-V2 §11: translate component memo misstatements (Ra/Rc),
   merge with group misstatements, evaluate against group materiality with the
   DOMAIN.md §9 bands. Unit test with a crafted multi-currency set (exact totals).
2. Completion additions (group engagements): every SIGNIFICANT/SPECIFIC component
   CLEARED; group SUM evaluated; consolidation ties. Archive gates on all.
3. Evaluation page: aggregated SUM table (source column: group/component), band
   banner; roll-forward copies component registry + scoping params (no memos).
**Acceptance:**
- [ ] Translation-merge totals exact; archive blocked until every gate passes
      (parametrized test over the gates); roll-forward copied/not-copied asserted.
