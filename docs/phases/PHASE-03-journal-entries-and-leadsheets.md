# Phase 3 — Adjusting Entries, Adjusted TB, Lead Schedules

Goal: propose/approve/post AJEs; see adjusted balances flow into TB views and per-FSLI
lead schedules.

Read first: DOMAIN.md §3 (entry rules), §2 (lead schedule definition).

---

### T-03.1 — Models
**Prereqs:** T-02.7
**Files:** Prisma `JournalEntry`, `JournalEntryLine` + migration;
`packages/shared/src/schemas/journal-entry.ts`
**Steps:**
1. `JournalEntry`: id, engagementId, number (int, sequential per engagement+type, assigned
   at creation), type (`AJE`|`RJE`|`CJE`), status (`PROPOSED`|`APPROVED`|`POSTED`|`REJECTED`),
   description (required), preparedById, approvedById?, postedById?, timestamps for each
   transition, createdAt/updatedAt.
2. `JournalEntryLine`: id, journalEntryId, accountId, debit (BigInt ≥ 0), credit
   (BigInt ≥ 0), memo?. Constraint enforced in service: exactly one of debit/credit > 0.
3. Zod schema validates: ≥ 2 lines, Σdebit = Σcredit > 0, line shape.
**Acceptance:**
- [ ] Migration applies; schema unit tests for the balance rule (balanced ok, unbalanced
      rejected, single line rejected, both-sides-on-one-line rejected).

### T-03.2 — JE service & API
**Prereqs:** T-03.1
**Files:** `apps/server/src/modules/journal-entries/{service.ts,routes.ts,+tests}`
**Steps:**
1. Endpoints under `/api/engagements/:engagementId/journal-entries`:
   CRUD (PROPOSED only is editable/deletable, and only by preparer or MANAGER+);
   `POST /:id/approve`, `POST /:id/post`, `POST /:id/reject` — MANAGER+ only; POSTED is
   immutable forever (edit/delete → 409 `JE_POSTED`); reject allowed from
   PROPOSED/APPROVED.
2. `getAdjustedBalances(engagementId)` in a shared server service
   (`modules/journal-entries/adjusted-balance.ts`): map accountId → unadjusted CY amount +
   Σ(debit − credit) of POSTED lines. Used by TB report, lead schedules, and later phases.
   Unit-test with a posted and a merely-approved entry (approved must NOT count).
3. Wire adjusted amounts into the Phase 2 report endpoints: report/summary now return
   `unadjusted`, `adjustment`, `adjusted` columns (update their tests).
4. Audit-log every transition.
**Acceptance:**
- [ ] Tests: lifecycle PROPOSED→APPROVED→POSTED; STAFF cannot approve (403); editing
      POSTED → 409; adjusted balance math exact; TB summary reflects a posted AJE.

### T-03.3 — JE UI
**Prereqs:** T-03.2
**Files:** `apps/web/src/pages/journal-entries/{JeListPage.tsx,JeEditorPage.tsx}`
**Steps:**
1. List: number, type, description, amount (Σ debits), status chips, lifecycle buttons
   per role. Editor: header fields + line grid (account combobox using engagement
   accounts, debit/credit inputs); live footer Σdebit/Σcredit with out-of-balance warning;
   save disabled until balanced.
**Acceptance:**
- [ ] Component test: editor blocks save while unbalanced; balance indicator updates.
- [ ] Manual: create AJE on demo data, approve + post as admin, see TB change.

### T-03.4 — Adjusted TB view
**Prereqs:** T-03.3
**Files:** `apps/web/src/pages/trial-balance/AdjustedTbPage.tsx`
**Steps:**
1. Columns: account, prior year, unadjusted, adjustments (click → popover listing the
   POSTED JEs and amounts hitting the account), adjusted. Totals row (all zero net).
**Acceptance:**
- [ ] Manual + component test (mocked API): adjustment popover lists entry numbers.

### T-03.5 — Lead schedules
**Prereqs:** T-03.4
**Files:** `apps/server/src/modules/leadsheets/{service.ts,routes.ts,+tests}`,
`apps/web/src/pages/leadsheets/{LeadsheetIndexPage.tsx,LeadsheetPage.tsx}`
**Steps:**
1. `GET /api/engagements/:id/leadsheets` → all FSLI groups with adjusted totals and
   movement; `GET /api/engagements/:id/leadsheets/:fsliCode` → DOMAIN.md §2 lead schedule
   rows (per account: PY, unadjusted, adjustments, adjusted, delta, deltaPct) + the JE
   list affecting this FSLI.
2. UI: index = grouped list (BS then IS) with totals; detail page per FSLI with the table
   and JE section. Movement % styled red when |deltaPct| > 10%.
**Acceptance:**
- [ ] Service test asserts exact rows for one FSLI from the fixture TB + one posted AJE.
- [ ] Manual: navigate index → Cash leadsheet.
