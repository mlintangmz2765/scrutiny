# Phase 11 — Methodology Engine & Smart Audit Programs

Goal: the risk assessment drives the file — a versioned procedure library generates
tailored work programs per FSLI × assertion, executed as structured working papers.

Read first: DOMAIN-V2.md §2 (selection rules — implement exactly); DOMAIN.md §6, §10.

---

### T-11.1 — Models & base methodology pack
**Prereqs:** T-10.8
**Files:** Prisma `MethodologyPack`, `ProcedureTemplate`, `EngagementProcedure` +
migration; `packs/base-isa/pack.json`; `packages/shared/src/schemas/methodology.ts`
**Steps:**
1. `MethodologyPack`: id, name, version (semver string), source (`BUILTIN`|`IMPORTED`|
   `CUSTOM`), importedAt. `ProcedureTemplate`: id, packId, code (unique per pack),
   title, body (markdown with `{materiality}`-style placeholders), tier
   (DOMAIN-V2 §2), fsliCodes (JSON array), assertions (JSON array), requiresTags,
   excludeTags (JSON arrays), isaRefs, sortOrder. `EngagementProcedure`: id,
   engagementId, fsliCode, assertion, templateId?, customTitle?, customBody?, status
   (`PROPOSED`|`NOT_STARTED`|`IN_PROGRESS`|`DONE`|`SUPERSEDED`), tailoringReason?,
   workingPaperId?, sortOrder.
2. Author `packs/base-isa/pack.json`: ≥ 40 procedures covering every DOMAIN.md §2 FSLI
   with at least BASIC+STANDARD tiers for EXISTENCE/COMPLETENESS/ACCURACY_VALUATION,
   EXTENDED for A.2/A.4/R.1, SIGNIFICANT for revenue recognition and management
   override (JE testing). English, ISA-referenced (e.g. "ISA 330.18").
3. Zod schema validates the pack file shape; seed imports the builtin pack idempotently.
**Acceptance:**
- [ ] Seed twice → one pack, stable template count (assert exact count); pack file
      passes schema validation in a test; invalid fixture pack rejected.

### T-11.2 — Pack import/export & custom overlay
**Prereqs:** T-11.1
**Files:** `apps/server/src/modules/methodology/{pack-service.ts,routes.ts,+tests}`
**Steps:**
1. `POST /api/methodology/packs/import` (JSON upload, ADMIN) with semver rules:
   same-name higher version imports as new pack rows; lower/equal rejected 409.
   `GET /api/methodology/packs`, `GET .../packs/:id/export` (round-trippable JSON).
2. Custom templates: `POST /api/methodology/templates` (PARTNER+) creates
   source=CUSTOM templates in a firm overlay pack (auto-created, version tracks
   edits). Overlay survives builtin upgrades untouched (test this).
**Acceptance:**
- [ ] Import→export round-trip is deep-equal; version downgrade rejected; overlay
      templates persist across a builtin pack upgrade in tests.

### T-11.3 — Entity profile & tailoring questionnaire
**Prereqs:** T-11.2
**Files:** Prisma `EntityProfile` + migration; module routes/service/tests;
`apps/web/src/pages/planning/EntityProfilePage.tsx`
**Steps:**
1. Profile per engagement: industry (free text + tag list), booleans producing tags —
   hasInventory, usesComplexIT, isFirstYearAudit, hasForeignOps, isPublicInterest,
   usesEstimates (extensible JSON `extraTags`). `GET/PUT /api/engagements/:id/profile`.
2. Tag semantics per DOMAIN-V2 §2 (requiresTags/excludeTags filtering). Profile is an
   archive-checklist prerequisite for program generation.
3. UI: questionnaire form on the Planning tab; roll-forward copies the profile.
**Acceptance:**
- [ ] Route tests incl. guard/access; profile round-trip; tags computed correctly
      from booleans (unit test).

### T-11.4 — Program generation service
**Prereqs:** T-11.3
**Files:** `packages/shared/src/domain/program-selection.ts` (+test);
`apps/server/src/modules/methodology/{generate-service.ts,+tests}`
**Steps:**
1. Pure function `selectProcedures({riskGrid, profileTags, templates})` implementing
   DOMAIN-V2 §2 exactly (tier ladder, significant-mandatory, tag filtering,
   UNASSESSED flagging). Deterministic ordering (fsli, assertion, tier, sortOrder).
2. Server service materializes the selection into EngagementProcedure rows:
   first run → status NOT_STARTED; re-run diff per DOMAIN-V2 §2 (new→PROPOSED,
   deselected-but-started→SUPERSEDED, manual rows untouched); returns
   {added, superseded, kept} summary. `POST /api/engagements/:id/program/generate`
   (LEAD), guarded by archivedGuard + profile-exists.
**Acceptance:**
- [ ] Unit tests: one exact-selection fixture per RMM level, significant mandatory,
      tag include/exclude, UNASSESSED list. Service tests: regen preserves manual and
      started rows exactly; diff summary counts asserted.

### T-11.5 — Program API & UI
**Prereqs:** T-11.4
**Files:** `apps/server/src/modules/methodology/{program-routes.ts,+tests}`;
`apps/web/src/pages/program/{ProgramPage.tsx,ProcedureRow.tsx}`
**Steps:**
1. `GET /api/engagements/:id/program?fsli=` grouped by FSLI/assertion with status,
   tier, links; `POST .../program/procedures` (manual add: title/body/fsli/assertion +
   mandatory tailoringReason); `PATCH .../procedures/:pid` (status, reason);
   `DELETE` only while PROPOSED/NOT_STARTED and template-sourced removals require a
   tailoringReason (recorded, audit-logged).
2. UI: per-FSLI program board (tier badges, status chips, UNASSESSED banner from
   generation), accept-all-PROPOSED action, add/remove with reason dialogs.
**Acceptance:**
- [ ] Route tests: reason required on removal/add, PROPOSED accept flow, engagement
      access/role gates. Component test: reason dialog blocks empty submit.

### T-11.6 — Procedure execution as structured working papers
**Prereqs:** T-11.5
**Files:** `apps/server/src/modules/methodology/{execution-service.ts,+tests}`;
WP integration retrofit; `apps/web/src/pages/program/ProcedureWorkPage.tsx`
**Steps:**
1. `POST .../procedures/:pid/start` creates a linked working paper (section by FSLI
   per DOMAIN.md §10 index; ref auto-suggest) whose body is the template body with
   placeholders resolved ({materiality}, {performanceMateriality}, {fsliName},
   {periodEnd}); procedure → IN_PROGRESS.
2. Structured conclusion on the WP: result `NO_EXCEPTIONS` | `EXCEPTIONS_NOTED`
   (requires linked misstatement(s) or review note) + conclusion text; recording it
   sets DONE. PREPARED sign-off required before DONE sticks (reuse Phase 7 chain).
3. Editing the WP after DONE resets procedure to IN_PROGRESS alongside the v1
   sign-off reset.
**Acceptance:**
- [ ] Tests: placeholder resolution exact, EXCEPTIONS requires linkage (400 otherwise),
      DONE↔sign-off coupling both directions.

### T-11.7 — Coverage check & completion integration
**Prereqs:** T-11.6
**Files:** `apps/server/src/modules/methodology/{coverage-service.ts,+tests}`;
completion checklist retrofit (new computed item); UI banner on RiskMatrix/Program
**Steps:**
1. `GET /api/engagements/:id/program/coverage` → per DOMAIN-V2 §2 coverage rule:
   cells with RMM ≥ MODERATE (or significant) lacking a DONE procedure, plus
   UNASSESSED cells with mapped balances.
2. New completion checklist item (computed): "Audit program covers all assessed
   risks" — satisfied when the coverage list is empty. Archive blocks otherwise.
3. Banners: risk matrix and program pages show uncovered-cell counts with links.
**Acceptance:**
- [ ] Tests: crafted grid yields exact uncovered set; checklist item flips when the
      last procedure completes; archive blocked/allowed accordingly.

### T-11.8 — Roll-forward & pack upgrades
**Prereqs:** T-11.7
**Files:** roll-forward service retrofit (+tests); `apps/server/src/modules/methodology/upgrade-service.ts` (+tests); docs `docs/user-guide/methodology.md`
**Steps:**
1. Roll-forward copies: entity profile, program structure as templates→NOT_STARTED
   (no conclusions/links), manual procedures with reasons. Uses current pack versions.
2. Pack upgrade flow: `POST /api/engagements/:id/program/upgrade {packId}` — re-runs
   generation against the new version, produces the same diff semantics + a written
   report row (audit log) of template changes affecting the engagement.
3. User guide page for the whole methodology module.
**Acceptance:**
- [ ] Roll-forward test asserts copied/not-copied sets exactly; upgrade produces
      expected diff on a two-version fixture pack; docs page exists and links are valid.
