# Scrutiny — Audit Domain Reference

This file is the **only authority** on audit concepts, formulas, and default values used in
the codebase. If code or a test disagrees with this file, the code is wrong. Every formula
here must be implemented in `packages/shared/src/domain/` with unit tests asserting the
worked examples **exactly**.

Standards alignment: International Standards on Auditing (ISA). Scrutiny implements
generally accepted mechanics; it does not claim certification under any standard.

---

## 1. The audit workflow (what the app models)

```
Client → Engagement (one fiscal year)
  Planning:   materiality, risk assessment, planning analytics
  Fieldwork:  TB import → FSLI mapping → lead schedules → procedures
              (sampling, JE testing, analytics) → adjusting entries → evidence
  Review:     review notes, sign-offs (preparer → reviewer → partner)
  Completion: SUM evaluation vs materiality, completion checklist, ARCHIVE (freeze)
  Next year:  roll-forward
```

Engagement statuses: `PLANNING → FIELDWORK → REVIEW → COMPLETION → ARCHIVED`.
Transitions only move forward, one step at a time, except ADMIN may move backward one step
(never out of ARCHIVED). ARCHIVED is terminal and freezes all writes.

## 2. Trial balance, chart of accounts, FSLI

- **Trial balance (TB)**: list of all GL accounts with closing balances. Must balance:
  sum of debits = sum of credits, i.e. sum of signed amounts = 0.
- **Sign convention**: debit balances positive, credit balances negative (assets/expenses
  normally positive; liabilities/equity/revenue normally negative).
- **FSLI (Financial Statement Line Item) group**: a presentation grouping (e.g. "Cash and
  cash equivalents"). Every account must be mapped to exactly one FSLI group before
  fieldwork views work. Unmapped accounts are flagged, never silently dropped.
- **Standard FSLI taxonomy** (seed data; code, name, statement, normal sign):

| Code | Name | Statement | Normal |
|---|---|---|---|
| A.1 | Cash and cash equivalents | BS | DR |
| A.2 | Trade receivables | BS | DR |
| A.3 | Other receivables | BS | DR |
| A.4 | Inventories | BS | DR |
| A.5 | Prepayments and other current assets | BS | DR |
| A.6 | Property, plant and equipment | BS | DR |
| A.7 | Intangible assets | BS | DR |
| A.8 | Investments and other non-current assets | BS | DR |
| L.1 | Trade payables | BS | CR |
| L.2 | Accrued liabilities and provisions | BS | CR |
| L.3 | Borrowings — current | BS | CR |
| L.4 | Borrowings — non-current | BS | CR |
| L.5 | Tax payables | BS | CR |
| L.6 | Other liabilities | BS | CR |
| E.1 | Share capital | BS | CR |
| E.2 | Retained earnings | BS | CR |
| E.3 | Other equity | BS | CR |
| R.1 | Revenue | IS | CR |
| R.2 | Other income | IS | CR |
| X.1 | Cost of sales | IS | DR |
| X.2 | Operating expenses | IS | DR |
| X.3 | Depreciation and amortization | IS | DR |
| X.4 | Finance costs | IS | DR |
| X.5 | Income tax expense | IS | DR |

- **Lead schedule (lead sheet)**: per-FSLI view showing each mapped account with: prior
  year final balance, current year unadjusted balance, adjustments (sum of posted JE lines
  hitting that account), adjusted balance, and movement vs prior year (absolute and %).

## 3. Adjusting entries

- Types: `AJE` (adjusting journal entry — corrects misstatements), `RJE` (reclassification
  — moves between accounts, no P&L effect required), `CJE` (client-prepared adjustment
  recorded for completeness).
- Statuses: `PROPOSED → APPROVED → POSTED`. Only POSTED entries affect adjusted balances.
  Only MANAGER/PARTNER may approve/post. A POSTED entry can never be edited or deleted —
  it is reversed by a new entry.
- Every entry must balance: sum(debits) = sum(credits), each ≥ 0, at least 2 lines.
- Adjusted balance(account) = unadjusted balance + Σ(debit − credit) of POSTED lines.

## 4. Assertions (ISA 315)

Use this fixed enum (applies to balances and transactions; keep one combined list):

`EXISTENCE`, `COMPLETENESS`, `ACCURACY_VALUATION`, `RIGHTS_OBLIGATIONS`, `CUTOFF`,
`CLASSIFICATION`, `OCCURRENCE`, `PRESENTATION`.

## 5. Materiality (ISA 320)

Inputs: benchmark type, benchmark amount (minor units), percentages.

| Benchmark | Default % | Allowed range |
|---|---|---|
| PROFIT_BEFORE_TAX | 5% | 3–10% |
| REVENUE | 0.5% | 0.5–1% |
| TOTAL_ASSETS | 0.5% | 0.5–1% |
| TOTAL_EQUITY | 1% | 1–2% |
| TOTAL_EXPENSES | 0.5% | 0.5–1% |

- `overallMateriality = roundHalfAwayFromZero(benchmarkAmount × benchmarkPct)`
- `performanceMateriality = roundHalfAwayFromZero(overallMateriality × pmPct)` where pmPct
  default 0.75, allowed 0.50–0.75.
- `clearlyTrivialThreshold = roundHalfAwayFromZero(overallMateriality × cttPct)` where
  cttPct default 0.05, allowed 0.03–0.10.
- Validation: reject percentages outside the allowed ranges; benchmarkAmount must be > 0
  (use absolute value of e.g. loss before tax — the UI tells the user to enter abs value).

**Worked example (test fixture):** benchmark PROFIT_BEFORE_TAX, amount 12,345,678 (minor
units), pct 0.05, pmPct 0.75, cttPct 0.05 →
overall = 617,284 (12,345,678 × 0.05 = 617,283.9 → rounds to 617,284),
performance = 462,963, clearly trivial = 30,864.

## 6. Risk assessment (ISA 315/330)

- Risk is assessed per **FSLI group × assertion**: `inherentRisk` ∈ {LOW, MODERATE, HIGH},
  `controlRisk` ∈ {LOW, MODERATE, HIGH}.
- `riskOfMaterialMisstatement (RMM)` is derived by this fixed matrix (max-like):

| IR \ CR | LOW | MODERATE | HIGH |
|---|---|---|---|
| **LOW** | LOW | LOW | MODERATE |
| **MODERATE** | LOW | MODERATE | HIGH |
| **HIGH** | MODERATE | HIGH | HIGH |

- Each risk row may carry: `isSignificantRisk` (boolean), `plannedResponse` (free text),
  and links to working papers (Phase 7).
- Planning analytics flag: any FSLI whose |adjusted CY − PY| > performance materiality is
  suggested as a risk candidate (suggestion only; user decides).

## 7. Analytics

### 7.1 Ratios (computed from FSLI group totals; use adjusted balances; sign-normalize so
all inputs are positive magnitudes)

| Ratio | Formula (FSLI codes from §2) |
|---|---|
| Current ratio | (A.1+A.2+A.3+A.4+A.5) / (L.1+L.2+L.3+L.5+ current part of L.6) — v1: (A.1..A.5)/(L.1+L.2+L.3+L.5+L.6) |
| Quick ratio | (A.1+A.2+A.3) / same denominator as current ratio |
| Gross margin % | (R.1 − X.1) / R.1 |
| Net margin % | (R.1+R.2 − X.1 − X.2 − X.3 − X.4 − X.5) / R.1 |
| DSO (days) | A.2 / R.1 × 365 |
| DIO (days) | A.4 / X.1 × 365 |
| DPO (days) | L.1 / X.1 × 365 |
| Debt to equity | (L.3+L.4) / (E.1+E.2+E.3) |
| Return on assets | net income / total assets (A.1..A.8) |
| Asset turnover | R.1 / total assets |

Division by zero → ratio value `null`, never `Infinity`/`NaN` in API responses.

### 7.2 Variance analysis

For each FSLI: `delta = adjustedCY − finalPY`, `deltaPct = delta / |finalPY|` (null when
PY = 0). Flag when |delta| > performance materiality **or** |deltaPct| > 0.10 (10%).
Both thresholds configurable per engagement.

### 7.3 Benford's law (first digit, applied to GL line amounts)

Expected P(d) = log10(1 + 1/d):

| d | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|
| P | 0.30103 | 0.17609 | 0.12494 | 0.09691 | 0.07918 | 0.06695 | 0.05799 | 0.05115 | 0.04576 |

- Population: absolute amounts ≥ 10 minor units (exclude 0 and tiny amounts).
- First digit of the absolute value's decimal representation.
- **Chi-square**: χ² = Σ((observed − expected)² / expected) over the 9 digits, expected =
  N × P(d). Report χ² and flag non-conformity when χ² > 15.507 (df=8, α=0.05).
- **MAD** (mean absolute deviation of proportions) with Nigrini first-digit thresholds:
  ≤ 0.006 close conformity; ≤ 0.012 acceptable; ≤ 0.015 marginal; > 0.015 nonconformity.
- **Worked example (test fixture):** N=1000 with observed counts
  [350, 180, 120, 90, 70, 60, 50, 45, 35] → proportions deviations |obs/N − P| are
  [0.04897, 0.00391, 0.00494, 0.00691, 0.00918, 0.00695, 0.00799, 0.00615, 0.01076];
  MAD = 0.01175 (within 1e-5) → "acceptable conformity"; χ² = 13.659 (within 0.01) →
  not flagged by chi-square.

### 7.4 Journal entry testing (rules engine over imported GL)

Each rule returns matching GL entries with a reason. v1 rule set (all individually
toggleable, parameters shown are defaults):

| Rule id | Flags entries that… | Params |
|---|---|---|
| `WEEKEND_POSTING` | were posted on Saturday/Sunday (engagement-local date) | — |
| `ROUND_AMOUNT` | have amount mod `roundUnit` = 0 | roundUnit = 1,000,000 minor units |
| `LARGE_AMOUNT` | have abs(amount) ≥ threshold | threshold = performance materiality |
| `POST_CLOSE` | were posted after fiscal period end | — |
| `SUSPICIOUS_KEYWORD` | description matches any keyword (case-insensitive) | ["plug", "fix", "adjust", "per mgmt", "reverse later", "temp"] |
| `RARE_USER` | were posted by a user with < minCount entries total | minCount = 5 |
| `SEQUENCE_GAP` | document number sequence has gaps (per journal source) | — |
| `UNBALANCED_DOC` | lines of one document don't sum to zero (data integrity) | — |

GL import minimum columns: document number, posting date, account code, description,
amount (signed) or debit/credit, posted-by user. Extra columns are kept as-is in a JSON
`raw` field.

## 8. Audit sampling (ISA 530)

All randomness uses a **seeded PRNG** (mulberry32; seed stored with the sample) so
selections are reproducible. Tests use fixed seeds and assert exact selections.

### 8.1 Methods

- **RANDOM**: sample of size n drawn without replacement, uniform over population items.
- **SYSTEMATIC**: interval k = floor(N / n); random start in [0, k); select every k-th item.
- **MUS** (monetary unit sampling, fixed-interval): see below.

### 8.2 MUS sample size

```
samplingInterval = tolerableMisstatement / confidenceFactor
sampleSize       = ceil(populationBookValue / samplingInterval)
```

Confidence factors (zero expected errors, Poisson) by risk of incorrect acceptance:

| Risk | 5% | 10% | 15% | 20% | 25% | 30% | 37% | 50% |
|---|---|---|---|---|---|---|---|---|
| Factor | 3.00 | 2.31 | 1.90 | 1.61 | 1.39 | 1.21 | 1.00 | 0.70 |

When expected misstatement > 0 use:
`samplingInterval = (tolerableMisstatement − expectedMisstatement × expansionFactor) / confidenceFactor`
with expansion factors: 5%→1.6, 10%→1.5, 15%→1.4, 20%→1.3, 25%→1.25, 30%→1.2, 37%→1.15, 50%→1.0.

**Worked example (test fixture):** population 10,000,000; tolerable misstatement 500,000;
risk 10% (factor 2.31); expected misstatement 0 → interval = 216,450 (floor of
500,000/2.31 = 216,450.21…; use `Math.floor` for the interval), sample size =
ceil(10,000,000 / 216,450) = 47.

### 8.3 MUS selection (fixed interval over cumulative monetary units)

1. Order population items as imported (stable).
2. Compute cumulative book values. Random start r = floor(rand() × interval).
3. Selection points: r, r+interval, r+2·interval, … Item containing a point is selected
   (an item spanning multiple points is selected once, noted as multi-hit).
4. Items with book value ≥ interval are **top-stratum**: always selected, examined 100%.

### 8.4 MUS evaluation

For each sampled item with audited value ≠ book value:
`tainting = (bookValue − auditedValue) / bookValue` (only for items < interval).

- Projected misstatement = Σ(tainting × interval) over taintings, ranked descending —
  plus, for top-stratum items, the actual misstatement (book − audited) added directly.
- Basic precision = confidenceFactor × interval.
- Upper misstatement limit (UML), simplified v1: projected misstatement + basic precision.
- Conclusion: if UML ≤ tolerable misstatement → "population accepted", else "population
  not accepted — extend procedures or propose adjustment".

**Worked example (test fixture):** interval 216,450, factor 2.31; two errors in
below-interval items: taintings 1.0 and 0.5 → projected = 1.5 × 216,450 = 324,675;
basic precision = 2.31 × 216,450 = 499,999.5 → round to 500,000 (roundHalfAwayFromZero);
UML = 824,675 > tolerable 500,000 → not accepted.

## 9. Misstatements & SUM (ISA 450)

- Misstatement record: description, FSLI group, amount (signed effect on profit and on
  assets — store both `profitEffect` and `assetEffect`), type ∈ {FACTUAL, JUDGMENTAL,
  PROJECTED}, status ∈ {UNCORRECTED, CORRECTED}, optional link to the JE that corrects it.
- SUM (summary of uncorrected misstatements): totals of UNCORRECTED by type; compare
  |total profitEffect| and |total assetEffect| against overall materiality and performance
  materiality. Output one of: `CLEARLY_IMMATERIAL` (total ≤ clearly trivial),
  `BELOW_MATERIALITY` (≤ performance materiality), `NEAR_MATERIALITY` (> performance, ≤
  overall), `MATERIAL` (> overall).
- Items individually ≤ clearly trivial threshold may be marked `isTrivial` and are excluded
  from totals (kept in the list, struck through in UI).

## 10. Working papers, sign-offs, review notes

- Binder structure: sections with reference prefixes. Seed index:
  `A` Planning, `B` Risk assessment, `C` Cash, `D` Receivables, `E` Inventory,
  `F` Prepayments & other assets, `G` PPE & intangibles, `H` Payables & accruals,
  `I` Borrowings, `J` Equity & tax, `K` Revenue & income, `L` Expenses, `Z` Completion.
- Working paper: `ref` (unique per engagement, e.g. "C-100"), title, section, markdown
  body, attachments, links (to JEs, samples, analytics runs, risks).
- Sign-off chain: `PREPARED` (any member) → `REVIEWED` (MANAGER+) → `PARTNER_REVIEWED`
  (PARTNER, only required where flagged). A sign-off records user + timestamp. Any edit to
  a signed working paper clears sign-offs above the edit (preparer edit clears all;
  reviewer-level changes don't exist — reviewers comment via review notes).
- Review note: on a working paper; `OPEN → CLEARED`; cleared-by recorded; threaded replies.
  Archiving requires zero OPEN review notes.

## 11. Completion & archive

Completion checklist (seeded, per engagement; all must be checked to archive):
1. All accounts mapped to FSLI groups.
2. TB balanced; adjusted TB balanced.
3. Materiality finalized.
4. All risks have planned responses.
5. All working papers signed off (prepared + reviewed; partner where flagged).
6. Zero open review notes.
7. SUM evaluated and conclusion recorded.
8. All journal entries POSTED or explicitly REJECTED (no PROPOSED/APPROVED leftovers).

Archive: PARTNER-only action; sets status ARCHIVED; all mutating endpoints return 409;
an archive snapshot row records timestamp, user, and content hash of the adjusted TB.

## 12. Roll-forward

Creating engagement N+1 from N copies: chart of accounts, FSLI mappings, working paper
binder structure (refs + titles, empty bodies, no sign-offs), risk rows (reset to blank
assessments, keep FSLI×assertion shape), completion checklist template. Prior-year
balances of N+1 = **final adjusted balances** of N. Nothing else carries over.
