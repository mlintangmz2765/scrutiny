# Phase 2 — Trial Balance Import & FSLI Mapping

Goal: import a TB from CSV/XLSX, validate it balances, map accounts to the standard FSLI
taxonomy, and view TB / grouped summary / prior-year comparison.

Read first: DOMAIN.md §2; ARCHITECTURE.md §6 (sign convention, minor units).

---

### T-02.1 — Models & FSLI seed
**Prereqs:** T-01.8
**Files:** Prisma models + migration; `apps/server/prisma/seed.ts` (extend);
`packages/shared/src/schemas/trial-balance.ts`
**Steps:**
1. Models (all engagement-scoped via `engagementId`):
   - `Account`: id, engagementId, code, name, unique(engagementId, code).
   - `TrialBalanceImport`: id, engagementId, kind (`CURRENT`|`PRIOR`), fileName,
     importedById, importedAt, rowCount. One active import per (engagement, kind):
     re-import **replaces** lines after explicit confirmation.
   - `TrialBalanceLine`: id, importId, accountId, amount (BigInt, signed: DR +, CR −).
   - `FsliGroup`: id, code, name, statement (`BS`|`IS`), normalSign (`DR`|`CR`),
     sortOrder. Global (not engagement-scoped), seeded.
   - `AccountMapping`: id, engagementId, accountId unique-per-engagement, fsliGroupId.
2. Seed all 24 FSLI groups exactly as DOMAIN.md §2 table, sortOrder = table order.
   Idempotent (upsert by code).
**Acceptance:**
- [ ] Migration applies; `pnpm db:seed` twice yields exactly 24 FsliGroup rows.

### T-02.2 — File parsing service
**Prereqs:** T-02.1
**Files:** `apps/server/src/modules/trial-balance/{parser.ts,parser.test.ts}`,
`fixtures/tb-valid.csv`, `fixtures/tb-valid.xlsx`, `fixtures/tb-unbalanced.csv`,
`fixtures/tb-duplicate-codes.csv`, `fixtures/tb-bad-amounts.csv`
**Steps:**
1. `parseTrialBalanceFile(buffer, fileName, columnMap, minorUnitsPerMajor)` → typed result
   `{rows: ParsedRow[], errors: RowError[]}`. `columnMap` tells which source column holds:
   accountCode, accountName, and either `balance` (signed) or `debit`+`credit`.
2. CSV via `csv-parse` (handle BOM, `,` and `;` delimiters via option), XLSX via `exceljs`
   (first worksheet). Amounts: accept `1,234.56`, `1.234,56` (explicit `decimalSeparator`
   option in columnMap — no guessing), parentheses as negative, blank as 0. Convert to
   integer minor units with `assertSafeAmount`.
3. Validations (collect, don't throw): duplicate account codes, unparseable amounts, both
   debit and credit non-zero, missing code/name. Separately compute `isBalanced`
   (Σ signed = 0) on the parsed total.
4. Fixture `tb-valid.csv`: ≥ 30 realistic accounts (cash, AR, inventory, PPE, AP, loans,
   equity, revenue, COGS, expenses) that balance exactly and map cleanly onto the FSLI
   taxonomy; reuse this fixture in every later phase that needs a TB.
**Acceptance:**
- [ ] Parser unit tests cover all five fixtures incl. exact minor-unit values for at
      least 3 rows, both decimal separator modes, and the XLSX path.

### T-02.3 — Import API
**Prereqs:** T-02.2
**Files:** `apps/server/src/modules/trial-balance/{service.ts,routes.ts,+tests}`
**Steps:**
1. `@fastify/multipart` for upload. Endpoints (all under
   `/api/engagements/:engagementId/trial-balance`, all behind `requireEngagementAccess` +
   `archivedGuard`):
   - `POST /preview` (multipart file + columnMap JSON + kind) → parsed preview: first 50
     rows, full error list, totals, isBalanced. Nothing persisted.
   - `POST /import` (same payload) → 400 `TB_INVALID` if any row errors or unbalanced;
     else replaces the (engagement, kind) import transactionally: upsert Accounts by code
     (update name), insert lines, delete lines of the replaced import. Returns summary.
   - `GET /` → current + prior import metadata, totals, unmapped account count.
2. Importing PRIOR uses the same pipeline (kind=`PRIOR`).
**Acceptance:**
- [ ] Route tests: preview reports errors without persisting; valid import persists exact
      line count; unbalanced rejected; re-import replaces (no duplicate accounts);
      archived engagement → 409.

### T-02.4 — Import UI
**Prereqs:** T-02.3, T-01.7
**Files:** `apps/web/src/pages/trial-balance/{TbImportPage.tsx,ColumnMapForm.tsx}`
**Steps:**
1. Engagement tab "Trial balance". Wizard: (1) choose kind + file, (2) column mapping
   form (dropdowns listing detected source headers; decimal separator radio), (3) preview
   table with errors highlighted + totals + balanced badge, (4) confirm import (disabled
   until balanced & error-free; re-import warns it replaces).
**Acceptance:**
- [ ] Component test: wizard blocks confirm when preview has errors.
- [ ] Manual: import `fixtures/tb-valid.csv` end to end.

### T-02.5 — Mapping API + auto-suggest
**Prereqs:** T-02.3
**Files:** `apps/server/src/modules/mapping/{service.ts,routes.ts,+tests}`,
`packages/shared/src/domain/mapping-suggest.ts` (+test)
**Steps:**
1. Endpoints: `GET /api/engagements/:id/mappings` (every account + current mapping +
   suggestion), `PUT /api/engagements/:id/mappings` (bulk: array of {accountId,
   fsliGroupId}), guards as usual.
2. `suggestFsli(accountName)`: lowercase keyword table → FSLI code; e.g. cash/bank→A.1,
   receivable/debtor→A.2, inventory/stock→A.4, prepaid→A.5, equipment/property/vehicle→A.6,
   payable/creditor→L.1, loan/borrowing→L.4, capital/share→E.1, retained→E.2,
   revenue/sales→R.1, cost of (goods|sales)/cogs→X.1, salary/rent/utilities/office→X.2,
   depreciation/amortization→X.3, interest→X.4, tax expense→X.5. No match → null.
   Keyword list lives in one exported const.
**Acceptance:**
- [ ] Unit tests for ≥ 12 suggestion cases incl. null; route tests for bulk save and
      validation (unknown fsliGroupId → 400).

### T-02.6 — Mapping UI
**Prereqs:** T-02.4, T-02.5
**Files:** `apps/web/src/pages/trial-balance/MappingPage.tsx`
**Steps:**
1. Table of accounts: code, name, CY amount, FSLI dropdown (grouped BS/IS), suggestion
   shown as one-click "apply" chip; filter "unmapped only"; "Apply all suggestions"
   button; single Save (bulk PUT). Unmapped count badge on the tab.
**Acceptance:**
- [ ] Component test: apply-all fills dropdowns from suggestions; save sends one bulk
      request. Manual: map the demo TB fully.

### T-02.7 — TB views
**Prereqs:** T-02.6
**Files:** `apps/server/src/modules/trial-balance/report-service.ts` (+tests),
`apps/web/src/pages/trial-balance/TbReportPage.tsx`
**Steps:**
1. `GET .../trial-balance/report` → rows {accountCode, accountName, fsliCode|null,
   priorAmount, currentAmount} + totals; `GET .../trial-balance/summary` → per-FSLI
   {fsliCode, name, statement, priorTotal, currentTotal, delta, deltaPct(null-safe)}.
2. UI: two views (Accounts / By FSLI) with column totals, unmapped rows highlighted,
   amounts right-aligned formatted per engagement currency.
**Acceptance:**
- [ ] Service tests assert exact totals from `tb-valid.csv` fixture (write the expected
      numbers into the test, derived by hand from the fixture).
- [ ] Manual: both views render; totals row shows 0 net for accounts view.
