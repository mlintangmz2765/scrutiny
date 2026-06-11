# Phase 6 — Audit Sampling

Goal: draw reproducible random / systematic / MUS samples from a population (GL subset or
uploaded list), record audited values, and evaluate MUS results.

Read first: DOMAIN.md §8 (all formulas, factor tables, worked examples).

---

### T-06.1 — Sampling domain functions
**Prereqs:** Phase 5 complete (population sources); domain code itself only needs T-00.2
**Files:** `packages/shared/src/domain/{prng.ts,sampling.ts}` (+tests)
**Steps:**
1. `mulberry32(seed: number)` PRNG returning `() => number` in [0,1). Test: first 5
   values for seed 42 asserted exactly (compute once, pin in test).
2. `drawRandomSample(items, n, seed)` — Fisher-Yates partial shuffle using the PRNG,
   without replacement, stable result for fixed seed.
3. `drawSystematicSample(items, n, seed)` — interval `k = floor(N/n)`, start
   `floor(rand()*k)`, every k-th.
4. `musSampleSize({populationBookValue, tolerableMisstatement, expectedMisstatement,
   riskPct})` and `musSelect(items, interval, seed)` per DOMAIN.md §8.2–8.3 (factor and
   expansion-factor tables as exported consts; top-stratum split; multi-hit noted once).
   Items carry `{id, bookValue}` with bookValue = abs(minor units) > 0; zero/negative
   book values are excluded by the caller and reported.
**Acceptance:**
- [ ] Tests assert the DOMAIN.md worked example (interval 216,450; n 47), every factor
      table entry, top-stratum selection, multi-hit counted once, fixed-seed exactness
      for all three methods.

### T-06.2 — MUS evaluation
**Prereqs:** T-06.1
**Files:** `packages/shared/src/domain/mus-evaluation.ts` (+test)
**Steps:**
1. `evaluateMus({sampledItems: [{bookValue, auditedValue, isTopStratum}], interval,
   riskPct})` → `{projectedMisstatement, basicPrecision, upperMisstatementLimit,
   conclusion}` per DOMAIN.md §8.4 (taintings only for non-top-stratum; top-stratum
   misstatements added directly; conclusion vs tolerable passed in or returned raw —
   return raw numbers AND a `conclude(uml, tolerable)` helper).
2. Overstatements only in v1; understatement (negative tainting) net against projection
   but never below 0 — document this simplification in the function doc comment.
**Acceptance:**
- [ ] Tests assert the DOMAIN.md worked example exactly (projected 324,675; basic
      precision 500,000; UML 824,675; not accepted) plus a zero-error case
      (UML = basic precision, accepted when ≤ tolerable).

### T-06.3 — Sampling API
**Prereqs:** T-06.2
**Files:** Prisma `Sample`, `SampleItem` + migration;
`apps/server/src/modules/sampling/{service.ts,routes.ts,+tests}`;
`packages/shared/src/schemas/sampling.ts`
**Steps:**
1. `Sample`: id, engagementId, name, method (`RANDOM`|`SYSTEMATIC`|`MUS`), populationSource
   (`GL_FILTER`|`UPLOAD`), populationFilter (JSON: account codes/date range) or uploaded
   list stored as SampleItems with selected=false, params (JSON: n / riskPct / tolerable /
   expected), seed, interval?, populationBookValue, populationCount, status
   (`DRAFT`|`SELECTED`|`TESTED`|`EVALUATED`), createdById, timestamps.
2. `SampleItem`: id, sampleId, sourceRef (glEntryId or upload row no), description,
   bookValue, selected, isTopStratum, auditedValue?, note?.
3. Endpoints under `/api/engagements/:id/samples`: CRUD draft; `POST /:sid/select`
   (runs domain selection, persists, status SELECTED — re-select only while no audited
   values entered); `PUT /:sid/items` (bulk audited values; status TESTED when all
   selected items have auditedValue); `POST /:sid/evaluate` (MUS only → persists
   evaluation JSON on Sample, status EVALUATED); `GET` endpoints for list/detail/items
   (paginated).
4. Population from GL filter computed server-side (excluded zero/negative bookValues
   reported in response).
**Acceptance:**
- [ ] Route tests: full MUS lifecycle on a crafted population reproduces domain numbers;
      re-select blocked after audited values exist (409); RANDOM/SYSTEMATIC lifecycles.

### T-06.4 — Sampling UI
**Prereqs:** T-06.3
**Files:** `apps/web/src/pages/sampling/{SamplesListPage.tsx,SampleWizardPage.tsx,SampleDetailPage.tsx}`
**Steps:**
1. Wizard: (1) name + method, (2) population (GL filter form with live count/total, or
   CSV upload), (3) params (MUS: risk %, tolerable, expected — show computed interval and
   n live using shared domain functions), (4) select → selection table.
2. Detail page: items grid with audited-value inputs (inline edit, bulk save), top-stratum
   badge, evaluate button (MUS) showing projected/BP/UML and conclusion banner;
   export selection to CSV (client-side).
**Acceptance:**
- [ ] Component test: params step shows interval/n matching domain function for given
      inputs. Manual: full MUS run on demo GL.
