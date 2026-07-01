# Scrutiny — Audit Domain Reference, Volume 2 (Phases 10–19)

Extension of [DOMAIN.md](./DOMAIN.md) for the Big-4 parity phases. The same law applies:
this file is the **only authority** on v2 formulas and defaults; every formula is
implemented in `packages/shared/src/domain/` with unit tests asserting the worked
examples **exactly**. DOMAIN.md rules (money in minor units, `roundHalfAwayFromZero`,
debit +/credit −) apply everywhere below.

---

## 1. Engagement-level roles (Phase 10)

`EngagementMember.engagementRole` ∈ `LEAD` | `REVIEWER` | `MEMBER` — decoupled from the
global role. Permission matrix (global role still gates firm-level actions per
ARCHITECTURE.md §5):

| Action | MEMBER | REVIEWER | LEAD |
|---|---|---|---|
| Edit working papers, run analytics, enter samples | ✅ | ✅ | ✅ |
| PREPARED sign-off | ✅ | ✅ | ✅ |
| REVIEWED sign-off | ❌ | ✅ | ✅ |
| Approve/post JEs, finalize materiality | ❌ | ❌ | ✅ |
| Manage members, status transitions | ❌ | ❌ | ✅ |

Rules: every engagement has exactly one LEAD at any time (transferable); the REVIEWED
signer must not equal the PREPARED signer (unchanged from DOMAIN.md §10);
`PARTNER_REVIEWED` still requires global PARTNER. Backward compatibility: existing
members migrate to MEMBER, engagement creators to LEAD.

## 2. Methodology — risk-to-procedure selection (Phase 11)

Procedure templates carry `tier` ∈ `BASIC` | `STANDARD` | `EXTENDED` | `SIGNIFICANT`
plus `fsliCodes[]`, `assertions[]`, and profile `tags[]`. Selection for one
FSLI × assertion cell with derived RMM (DOMAIN.md §6):

| RMM | Tiers selected |
|---|---|
| (unassessed) | none — cell flagged `UNASSESSED` |
| LOW | BASIC |
| MODERATE | BASIC + STANDARD |
| HIGH | BASIC + STANDARD + EXTENDED |
| isSignificantRisk = true | additionally ALL matching SIGNIFICANT (mandatory, non-removable without reason) |

Profile filtering runs after tier selection: a template is excluded when it has
`requiresTags` not satisfied by the entity profile, or an `excludeTags` match (e.g.
`inventory` procedures drop when profile says `hasInventory=false`).

Regeneration diff: procedures added by a re-run are `PROPOSED`; procedures no longer
selected but already started/DONE are kept and flagged `SUPERSEDED` (never deleted);
manually added procedures are never removed by regeneration.

Coverage rule (archive blocker): every FSLI × assertion with RMM ≥ MODERATE (or
significant) must have ≥ 1 procedure with status DONE and a recorded conclusion.

## 3. PBC and confirmation state machines (Phases 12–13)

PBC request: `REQUESTED → UPLOADED → ACCEPTED | REJECTED`; `REJECTED → UPLOADED`
(client re-submits). Only ACCEPTED files become engagement attachments. Overdue =
status ∈ {REQUESTED, REJECTED} and dueDate < today.

Confirmation: `DRAFT → SENT → REMINDED* → RECEIVED | EXCEPTION | NO_REPLY`.
`RECEIVED` requires an attached response; `EXCEPTION` additionally requires a linked
misstatement (DOMAIN.md §9) or a documented resolution; `NO_REPLY` requires a linked
alternative-procedures working paper. Completion rule: no confirmation may remain in
SENT/REMINDED at archive.

## 4. Journal-entry composite risk score (Phase 14)

Per GL entry, score = min(100, Σ weights of triggered features):

| Feature | Trigger | Weight |
|---|---|---|
| WEEKEND | posted Sat/Sun | 10 |
| OFF_HOURS | posted 22:00–05:59 local | 8 |
| ROUND_AMOUNT | abs(amount) mod 1,000,000 minor units = 0 | 12 |
| NEAR_THRESHOLD | 0.98·T ≤ abs(amount) < T, T = approval threshold param | 15 |
| RARE_USER | poster has < 5 entries in population | 15 |
| RARE_ACCOUNT | account has < 10 postings in population | 10 |
| POST_CLOSE | posting date > period end | 15 |
| KEYWORD | description matches DOMAIN.md §7.4 keyword list | 15 |
| LARGE | abs(amount) ≥ performance materiality | 10 |

**Worked example (test fixture):** entry posted Saturday 23:10, amount 5,000,000
(round), by a user with 3 entries → WEEKEND 10 + OFF_HOURS 8 + ROUND_AMOUNT 12 +
RARE_USER 15 = **45**. An entry triggering everything scores min(100, 110) = **100**.
Default review threshold: score ≥ 40 (parameter).

## 5. Subledger analytics definitions (Phase 14)

- **AR aging buckets** by days past due (due date; fall back to document date + 30):
  `0–30`, `31–60`, `61–90`, `>90`. Bucket edges inclusive on the lower bound.
- **Monthly DSO** = AR balance at month end ÷ revenue of that month × days in month;
  null when the month's revenue is 0.
- **Duplicate payment candidate**: same vendor AND identical abs(amount) in minor units
  AND posting dates ≤ 30 days apart AND different document numbers. Exact match only —
  no fuzzy tolerance in v2.
- **Worked example:** vendor V-01 payments of 1,250,000 on 2026-03-02 (doc AP-101) and
  2026-03-28 (doc AP-244) → candidate pair. Same amounts 45 days apart → not flagged.

## 6. Revenue analytics definitions (Phase 14)

- **Cutoff window**: revenue entries posted within ±7 days (default, parameter) of
  period end are the cutoff population; report both sides separately.
- **Credit-note ratio (monthly)** = abs(credit notes issued in month) ÷ gross revenue
  of month; flag months where the ratio exceeds the 12-month median by > 50% (relative).

## 7. Substantive analytical procedures — ISA 520 math (Phase 14)

Expectation via ordinary least squares on n prior monthly observations (n ≥ 12):
`y = a + b·x` fit by standard OLS. For a new month x₀:

- expectation `E = a + b·x₀`
- standard error of estimate `SE = sqrt(Σ(yᵢ − ŷᵢ)² / (n − 2))`
- precision `P = t · SE` with fixed t-values: n≥30 → 2.05; 20≤n<30 → 2.09; 12≤n<20 → 2.20
- investigation threshold `T = min(P, performanceMateriality)`
- investigate when `|actual − E| > T`.

**Worked example (test fixture):** points (1,100), (2,110), (3,120), …, (12,210) —
perfect line y = 90 + 10x, n = 12. For x₀ = 13: E = 220, SE = 0, P = 0, so T = 0 and
any deviation from 220 is flagged. Second fixture: same points with y₁₂ = 215 instead
of 210 (one 5-unit deviation): b = 10.03497 (±1e-5), a = 89.65152 (±1e-5),
E(13) = 220.10606 (±1e-4), SE = 1.42887 (±1e-4), P = 2.20 × SE = 3.14351 (±1e-4).
Actual 226 → |226 − 220.10606| = 5.89394 > 3.14351 → investigate.

Amounts here are in major units for readability; implementation works in minor units
and rounds only displayed values (`roundHalfAwayFromZero`).

## 8. FS tie-out and disclosure states (Phase 15)

Every bound FS value has a tie-out state: `UNTICKED → TICKED`; any change to the
underlying adjusted balance after ticking resets it to `STALE`. Archive requires all
bound values TICKED and zero STALE. Text blocks must not contain raw numeric literals
≥ 1,000 unless wrapped in a `{literal}` exemption with a reason (enforced by lint-like
validation in the FS service). Disclosure checklist item states:
`OPEN → YES | NO | NA` — NO requires a note reference or a reason; archive requires
zero OPEN.

## 9. FX translation and CTA (Phase 16)

Component TB in local currency translates to group currency:

- Assets & liabilities: **closing rate** `Rc`.
- Income statement: **average rate** `Ra`.
- Equity items: **historical rates** as recorded per item (input data).
- `CTA = translated net assets at Rc − translated equity at historical − translated
  profit at Ra` (profit for the year, DOMAIN.md §2 sign conventions apply).

**Worked example (test fixture):** local currency amounts — assets 1,000, liabilities
600, share capital 300 (historical rate 9.0), retained earnings opening 50 (historical
9.5), profit for year 50. Rates: Rc = 10.0, Ra = 9.8.
Translated: net assets (1,000 − 600) × 10.0 = 4,000; capital 300 × 9.0 = 2,700;
opening RE 50 × 9.5 = 475; profit 50 × 9.8 = 490. **CTA = 4,000 − 2,700 − 475 − 490 =
335** (credit). Consolidated equity ties: 2,700 + 475 + 490 + 335 = 4,000. ✔

## 10. Component significance & materiality allocation (Phase 16)

Significance classification (defaults, parameterizable): a component is `SIGNIFICANT`
when its share of group benchmark ≥ 15%, `SPECIFIC` when 5–15% or it carries a
significant risk, else `NONE` (analytical only).

Component materiality (simplified allocation model — a documented policy default):

```
CM_i = min( 0.9 × groupOverallMateriality,
            groupPerformanceMateriality × sqrt(B_i / B_group) )
floored at 2 × groupClearlyTrivialThreshold
```

where `B_i` = component benchmark amount, `B_group` = group benchmark amount.

**Worked example (test fixture):** group OM 1,000,000; PM 750,000; CTT 50,000.
Component with B_i/B_group = 0.25 → 750,000 × 0.5 = 375,000 → CM = 375,000.
Component with share 0.01 → 750,000 × 0.1 = 75,000 < floor 100,000 → CM = 100,000.
Dominant component share 1.0 → 750,000 vs cap 900,000 → CM = 750,000.

## 11. Group evaluation aggregation (Phase 16)

Group SUM = union of the group's own misstatements and every component's uncorrected
misstatements translated at Ra (profit effects) / Rc (asset effects). The DOMAIN.md §9
conclusion bands apply against **group** materiality. A component clearance memo is
required from every SIGNIFICANT and SPECIFIC component before archive.

## 12. Quality management rules (Phase 17)

- **EQCR required** when any flag holds: listed/public-interest client, engagement
  risk rated HIGH at planning, or first-year audit (parameters). The EQCR reviewer:
  global PARTNER, not an engagement member, ≠ signing partner. EQCR sign-off is a
  distinct level above PARTNER_REVIEWED and gates archive when required.
- **Independence**: every member must submit a declaration (CONFIRMED or THREAT +
  safeguards text) before their first sign-off on the engagement; a THREAT without a
  LEAD-accepted safeguard blocks that member's sign-offs.
- **Rotation clocks**: partner tenure = consecutive years as signing partner for the
  client; warn at 5 years, block assignment at 7 (parameters; jurisdictional).
- **Archive deadline**: archiveDueDate = report date + 60 days (parameter). Escalation:
  notify LEAD at 14 days remaining, PARTNER at 7, firm ADMIN on breach. Breaches are
  recorded immutably with a root-cause tag (`ISQM_ROOT_CAUSES` fixed list: workload,
  methodology, competence, tooling, client, other).

## 13. Practice management formulas (Phase 18)

- `utilization = chargedHours / availableHours` per user per period; available =
  workdays × dailyHours (config, default 8).
- `budgetVariance = actualHours − budgetHours` (positive = overrun).
- `realization = billedFee / Σ(chargedHours × standardRate)`.
- **Worked example:** 120 charged of 160 available → utilization 0.75. Budget 100 h,
  actual 120 h → variance +20. Billed 90,000,000; 120 h × 1,000,000 standard →
  realization 0.75.

## 14. AI governance (Phase 19)

Every AI output is born `PROPOSED` and is inert until a human `ACCEPTED` it (becoming
ordinary content attributed to the accepting user) or `REJECTED` it. No AI output may
ever transition state automatically. The immutable `AiInteraction` log records: model
id, provider, prompt template id (never raw client data in the log), input document
refs, output hash, proposer surface, reviewer id, decision, timestamps. The kill
switch (`AI_ENABLED=false`) hides all AI surfaces and refuses gateway calls. Red-team
suite: prompt-injection fixtures must not produce tool-calls/state changes — asserted
in CI against the mock provider.
