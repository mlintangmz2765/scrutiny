# Phase 15 — Financial Statement Suite

Goal: build, tie out, and export the FS package inside Scrutiny — statements and notes
with live-bound numbers, disclosure checklists, blacklines, optional iXBRL.

Read first: DOMAIN-V2.md §8 (tie-out & disclosure states); DOMAIN.md §2 (FSLI).

---

### T-15.1 — Models & binding resolver
**Prereqs:** T-10.8
**Files:** Prisma `FsDocument`, `FsBlock`, `FsVersion` + migration;
`packages/shared/src/schemas/fs.ts`;
`apps/server/src/modules/fs/{binding-service.ts,+tests}`
**Steps:**
1. `FsDocument`: id, engagementId (unique — one package per engagement), title,
   updatedAt. `FsBlock`: id, documentId, parentId?, kind (`HEADING`|`PARAGRAPH`|
   `TABLE`|`STATEMENT`), sortOrder, content JSON. Content grammar (zod):
   paragraphs are rich-text runs where numeric tokens must be bindings
   `{bind: {source: 'FSLI'|'ACCOUNT'|'TOTAL', code, period: 'CY'|'PY', sign}}` or
   `{literal: {value, reason}}` per DOMAIN-V2 §8; STATEMENT blocks reference the
   Phase 8 draft-FS layouts; TABLE cells may bind.
2. Binding resolver: resolves every binding against the adjusted-TB/leadsheet
   services (v1) at read time — bound values are never stored.
3. `FsVersion`: id, documentId, number, snapshot JSON (blocks + resolved values),
   createdById/At — immutable.
**Acceptance:**
- [ ] Resolver tests: FSLI/account/total bindings equal service values exactly for
      the fixture engagement; posting a new AJE changes resolved output with no
      write to blocks; version snapshot is deep-frozen (mutation attempt fails).

### T-15.2 — FS builder API
**Prereqs:** T-15.1
**Files:** `apps/server/src/modules/fs/{service.ts,routes.ts,+tests}`
**Steps:**
1. Endpoints under `/api/engagements/:id/fs`: get document (auto-create with a
   default skeleton: BS + IS statement blocks + standard note headings), block CRUD
   (MEMBER+, archivedGuard), reorder, `POST /versions` (snapshot, LEAD),
   `GET /versions/:n`.
2. Literal-guard validation per DOMAIN-V2 §8: rejecting numeric literals ≥ 1,000 in
   text runs without a `{literal, reason}` wrapper (400 `FS_RAW_NUMBER`).
3. Default skeleton derives statement blocks from Phase 8 draft-FS structure.
**Acceptance:**
- [ ] Route tests: skeleton creation idempotent, literal guard trips/passes,
      reorder persists, versions immutable & listed; access/role/archived gates.

### T-15.3 — FS builder UI
**Prereqs:** T-15.2
**Files:** `apps/web/src/pages/fs/{FsBuilderPage.tsx,BlockEditor.tsx,BindingPicker.tsx}`
(+component tests)
**Steps:**
1. Document outline (left), block editor (right): headings/paragraphs with a
   binding picker (searchable FSLI/account tree, CY/PY toggle) inserting binding
   chips rendered as live `<Amount>` values; statement blocks render the Phase 8
   views read-only; literal insertion requires the reason dialog.
2. Save = block PATCH; version snapshot button (LEAD); version list drawer.
**Acceptance:**
- [ ] Component tests: binding chip renders resolved value from mocked API; literal
      dialog enforces reason; raw typed number ≥1,000 surfaces the server error
      inline.

### T-15.4 — Tie-out
**Prereqs:** T-15.3
**Files:** Prisma `FsTick` + migration; `apps/server/src/modules/fs/{tieout-service.ts,+tests}`;
completion checklist retrofit; UI overlay on FsBuilder
**Steps:**
1. `FsTick`: id, documentId, bindingKey (stable hash of block+path+bind), state
   (`UNTICKED`|`TICKED`|`STALE`), tickedById/At, valueAtTick (minor units).
2. Service per DOMAIN-V2 §8: tick stores current resolved value; any later resolve
   whose value ≠ valueAtTick flips state to STALE (computed on read — no cron);
   endpoints: tick/untick per binding, summary (counts per state).
3. Completion item (computed): all bindings TICKED, zero STALE, zero UNTICKED.
4. UI tie-out mode: overlay checkboxes on every binding chip, red highlight for
   STALE with old→new values, progress bar.
**Acceptance:**
- [ ] Tests: tick→AJE posts→state STALE with both values; summary counts exact;
      archive blocked until clean; overlay component test (mocked states).

### T-15.5 — Disclosure checklist engine
**Prereqs:** T-15.4
**Files:** Prisma `DisclosurePack`, `DisclosureItem`, `DisclosureResponse` + migration;
`packs/disclosure-ifrs-lite/pack.json`; module service/routes/tests;
`apps/web/src/pages/fs/DisclosureChecklistPage.tsx`
**Steps:**
1. Pack format mirrors T-11.2 mechanics (import/export, versioning): items with id,
   section, requirement text, sourceRef (e.g. "IAS 1.54"), applicabilityTags.
   Seed `disclosure-ifrs-lite` (~60 items across presentation, revenue, PPE,
   leases-lite, instruments-lite, related parties).
2. Responses per engagement: `OPEN → YES | NO | NA` per DOMAIN-V2 §8 (NO requires
   note link or reason; YES may link the satisfying FsBlock). Applicability filter
   from the Phase 11 entity profile tags.
3. Completion item: zero OPEN (NA and reasoned NO acceptable). UI: sectioned
   checklist with response controls, note-link picker, progress header.
**Acceptance:**
- [ ] Pack import round-trip; response state rules tested (NO w/o reason 400);
      profile tag filtering yields exact applicable subset on fixtures; completion
      gating verified.

### T-15.6 — Blackline & PDF export
**Prereqs:** T-15.5
**Files:** `apps/server/src/modules/fs/{diff-service.ts,pdf-renderer.ts,+tests}`;
`apps/web/src/pages/fs/FsComparePage.tsx`; dep `diff`
**Steps:**
1. Diff two FsVersions: block-aligned (by id), text runs diffed word-level (`diff`
   lib), value changes reported as old→new pairs; summary counts.
   `GET .../fs/compare?from=&to=`.
2. PDF renderer (pdfkit): title page, statements (tabular, right-aligned tnum
   amounts, totals rules), notes with resolved values; footer page numbers.
   `GET .../fs/versions/:n/pdf`.
3. Compare UI: side header pickers, inline ins/del rendering, changed-values table.
**Acceptance:**
- [ ] Diff tests: crafted versions yield exact ins/del/value-change sets; PDF parsed
      text contains statement totals; compare page component test.

### T-15.7 — Optional iXBRL export
**Prereqs:** T-15.6
**Files:** `apps/server/src/modules/fs/ixbrl.ts` (+tests);
`fixtures/taxonomy-core.csv`; docs `docs/user-guide/financial-statements.md`
**Steps:**
1. Minimal tagging: taxonomy CSV (concept, label, FSLI code default mapping) loaded
   per engagement; per-binding tag override endpoint. Export: XHTML document of the
   latest FsVersion with inline XBRL (`ix:nonFraction`) elements on tagged values,
   contexts for CY/PY periods, single-entity scheme.
2. Validation in tests: well-formed XML, every tagged value has concept/context/unit
   refs, untagged values exported plain. Document limitation (no full taxonomy
   validation — verify with external tools like Arelle) in the user guide.
**Acceptance:**
- [ ] Export parses as XML; assertions on ix elements for 3 fixture values;
      user-guide page covers the whole FS suite incl. iXBRL limits.
