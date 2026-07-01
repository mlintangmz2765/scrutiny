# Phase 18 — Practice Management Bridge

Goal: budgets, time, milestones, staffing, and engagement economics — enough for
partners to run the practice from Scrutiny without a separate PM tool.

Read first: DOMAIN-V2.md §13 (formulas — implement exactly).

---

### T-18.1 — Budgets & time capture
**Prereqs:** T-17.7
**Files:** Prisma `BudgetLine`, `TimeEntry` + migration;
`apps/server/src/modules/practice/{budget-service.ts,routes.ts,+tests}`;
`fixtures/time-import.csv`
**Steps:**
1. `BudgetLine`: id, engagementId, area (FSLI section code A–Z or `GENERAL`),
   budgetHours (int minutes — store minutes, display hours), feeAmount? (BigInt).
   `TimeEntry`: id, engagementId, userId, date, minutes, area, note?, status
   (`DRAFT`|`SUBMITTED`|`APPROVED`), source (`MANUAL`|`IMPORT`).
2. Endpoints: budget CRUD (LEAD), time entry CRUD (own rows while DRAFT/SUBMITTED),
   CSV import (email→user mapping, same parser conventions as T-02.2; fixture
   committed), variance endpoint per DOMAIN-V2 §13 (per area + total).
3. Minutes-not-decimal rule: all durations are integer minutes end to end.
**Acceptance:**
- [ ] Variance math exact on fixtures (incl. the DOMAIN-V2 worked example mapped to
      minutes); CSV import maps users and rejects unknown emails with row numbers;
      role/guard tests.

### T-18.2 — Timesheets & approval
**Prereqs:** T-18.1
**Files:** `apps/web/src/pages/practice/{TimesheetPage.tsx}` (+component test);
approval endpoints (+tests)
**Steps:**
1. Weekly grid UI (rows = my engagements+area, columns = days, cells = minutes as
   h:mm input), submit week → entries SUBMITTED.
2. Approval: LEAD (or MANAGER+) approves/rejects a member's week per engagement;
   APPROVED entries lock (edit → 409); rejection returns rows to DRAFT with a note.
3. My-week totals + engagement budget context shown inline.
**Acceptance:**
- [ ] Grid component test (cell edit → payload minutes); approval lock enforced;
      week idempotency (resubmit only DRAFT rows).

### T-18.3 — Milestone & deadline calendar
**Prereqs:** T-18.2
**Files:** `apps/web/src/pages/practice/FirmCalendarPage.tsx` (+component test);
calendar service extension (+tests)
**Steps:**
1. Extend the T-17.5 calendar endpoint with practice layers: milestones, archive
   deadlines, budget-exhaustion warnings (actual ≥ 90% of budget), staffing
   allocations (T-18.4 forward-compatible field).
2. Month/week grid UI with layer toggles and engagement color coding (stable hash →
   palette from design tokens); click-through to engagements.
**Acceptance:**
- [ ] Endpoint layer filters tested; 90% warning threshold boundary test; component
      test renders items on correct days from mocked data.

### T-18.4 — Staffing & utilization
**Prereqs:** T-18.3
**Files:** Prisma `Allocation`, `Availability` + migration; practice module
(+tests); `apps/web/src/pages/practice/StaffingPage.tsx`
**Steps:**
1. `Availability`: userId, weekStart, availableMinutes (default from FirmSettings
   dailyMinutes × 5). `Allocation`: userId, engagementId, weekStart,
   plannedMinutes. Conflict warning when Σ planned > available for a week
   (non-blocking, surfaced in responses and UI).
2. Utilization per DOMAIN-V2 §13 from APPROVED time vs availability, per user per
   period; endpoint with month/quarter grouping.
3. Staffing board UI: users × weeks heat grid (planned/available), engagement
   assignment editor (MANAGER+).
**Acceptance:**
- [ ] Utilization worked example exact (0.75); conflict detection boundary
      (equal = no warning, +1 minute = warning); grouping math tested.

### T-18.5 — Engagement economics dashboard
**Prereqs:** T-18.4
**Files:** `apps/server/src/modules/practice/{economics-service.ts,+tests}`;
`apps/web/src/pages/practice/EconomicsPage.tsx`; Excel export builder
**Steps:**
1. Per engagement: budget vs actual (hours, by area), fee, standard cost
   (Σ minutes × user standardRate — add `User.standardRateMinor` column, ADMIN-set),
   realization per DOMAIN-V2 §13, margin = fee − standard cost. Firm rollup with
   client grouping.
2. Endpoint (PARTNER+ firm-wide; LEAD own engagement), Excel export (Phase 8
   builder pattern: one summary sheet + per-engagement sheet).
3. Dashboard UI: table + variance bars, drill-down to time detail.
**Acceptance:**
- [ ] Realization worked example exact (0.75); margin/rollup math on a two-
      engagement fixture; export parsed cell assertions; visibility rules tested.
