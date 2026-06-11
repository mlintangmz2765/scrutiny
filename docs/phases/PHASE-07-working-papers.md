# Phase 7 — Working Papers, Sign-offs, Review Notes

Goal: the engagement binder — working papers organized in sections, file attachments,
prepare/review sign-off chain, review notes, and cross-references to evidence.

Read first: DOMAIN.md §10.

---

### T-07.1 — Models & binder seed
**Prereqs:** Phase 4 complete
**Files:** Prisma `WorkingPaper`, `Signoff`, `ReviewNote`, `ReviewNoteReply`,
`Attachment`, `WpLink` + migration; `packages/shared/src/schemas/working-paper.ts`;
binder section consts in `packages/shared/src/domain/binder.ts`
**Steps:**
1. `WorkingPaper`: id, engagementId, ref (unique per engagement), title, section (A–L, Z
   per DOMAIN.md §10), body (markdown text), requiresPartnerSignoff boolean, sortOrder,
   createdById, timestamps.
2. `Signoff`: id, workingPaperId, level (`PREPARED`|`REVIEWED`|`PARTNER_REVIEWED`),
   userId, signedAt. Unique(workingPaperId, level).
3. `ReviewNote`: id, workingPaperId, authorId, text, status (`OPEN`|`CLEARED`),
   clearedById?, clearedAt?; `ReviewNoteReply`: id, noteId, authorId, text, createdAt.
4. `Attachment`: id, workingPaperId, fileName, storedName (hash), mimeType, sizeBytes,
   uploadedById, createdAt.
5. `WpLink`: id, workingPaperId, targetType (`JOURNAL_ENTRY`|`SAMPLE`|`RISK`|
   `WORKING_PAPER`|`JE_TEST_RUN`), targetId.
6. When an engagement is created (retrofit engagement service), seed an empty binder:
   one index working paper per section (e.g. "A-000 Planning index") — section list from
   the shared const.
**Acceptance:**
- [ ] Migration applies; creating an engagement seeds 13 section index papers (test).

### T-07.2 — File storage & attachments
**Prereqs:** T-07.1
**Files:** `apps/server/src/lib/file-storage.ts` (+test);
attachment endpoints in `apps/server/src/modules/working-papers/`
**Steps:**
1. Storage: `data/files/<sha256-prefix2>/<sha256>` on disk; store sha256 as storedName;
   max upload 25 MB; allowed types: pdf, png, jpg, xlsx, docx, csv, txt, eml, msg
   (extension + mime allowlist; reject others 400 `FILE_TYPE_NOT_ALLOWED`).
2. `POST /api/working-papers/:wpId/attachments` (multipart),
   `GET /api/attachments/:id/download` (streams with original fileName,
   Content-Disposition), `DELETE` (only while WP not signed off).
**Acceptance:**
- [ ] Tests: upload/download round-trip byte-identical; disallowed type rejected;
      delete blocked after sign-off (409).

### T-07.3 — Working paper API & sign-off rules
**Prereqs:** T-07.2
**Files:** `apps/server/src/modules/working-papers/{service.ts,routes.ts,+tests}`
**Steps:**
1. CRUD under `/api/engagements/:id/working-papers` (+ `GET ?section=` index listing with
   sign-off status summary). Ref auto-suggest: next free number in section (e.g. C-100,
   C-110 — step 10).
2. Sign-off endpoints: `POST /:wpId/signoff {level}` and `DELETE /:wpId/signoff/:level`
   (only own sign-off or MANAGER+). Rules (enforce in service, unit-test each):
   - PREPARED: any engagement member.
   - REVIEWED: MANAGER+; requires PREPARED exists; reviewer ≠ preparer.
   - PARTNER_REVIEWED: PARTNER; requires REVIEWED.
   - Editing body/title/attachments of a signed WP deletes ALL sign-offs on it
     (DOMAIN.md §10) and audit-logs the reset.
   - Signed-at-any-level WP: body edits allowed (they reset sign-offs) but deletion of
     the WP is blocked (409 `WP_SIGNED`).
**Acceptance:**
- [ ] Tests: every rule above, including the reset-on-edit behavior and reviewer ≠
      preparer.

### T-07.4 — Binder UI
**Prereqs:** T-07.3
**Files:** `apps/web/src/pages/working-papers/{BinderPage.tsx,WorkingPaperPage.tsx}`
**Steps:**
1. Binder: section tree (A–Z) with per-WP row: ref, title, sign-off chips (P/R/PR with
   user initials + tooltip timestamp), open-notes count badge. "New working paper" with
   ref auto-suggest.
2. WP page: title/ref header, markdown editor (plain textarea + preview toggle using a
   small markdown renderer; no heavy WYSIWYG), attachments list (upload/download/delete),
   sign-off buttons per role state, links panel (T-07.6).
**Acceptance:**
- [ ] Component test: sign-off buttons disabled/enabled per role and chain state (mocked).
- [ ] Manual: create WP, attach a file, prepare + review sign-off, edit body → sign-offs
      reset visibly.

### T-07.5 — Review notes
**Prereqs:** T-07.3
**Files:** notes endpoints in working-papers module;
`apps/web/src/pages/working-papers/ReviewNotesPanel.tsx`; engagement-level
`ReviewNotesPage.tsx`
**Steps:**
1. Endpoints: CRUD note on WP (author or MANAGER+ may edit own text while OPEN),
   `POST /:noteId/clear` (MANAGER+ or note author), replies append-only.
   `GET /api/engagements/:id/review-notes?status=OPEN` engagement-wide list.
2. UI: panel on WP page (thread per note, clear button); engagement page listing all
   open notes grouped by WP with deep links.
**Acceptance:**
- [ ] Tests: clear flow, reply append, engagement-wide filter; UI component test for
      thread rendering.

### T-07.6 — Cross-references
**Prereqs:** T-07.3 (+ Phases 5–6 for target types to exist)
**Files:** link endpoints in working-papers module; `LinksPanel.tsx`; small "link to WP"
buttons retrofitted on JE detail, sample detail, risk row, JE test run views
**Steps:**
1. `POST /:wpId/links {targetType, targetId}` (validates target exists in same
   engagement), `DELETE /links/:linkId`, `GET /:wpId/links` returns resolved summaries
   (e.g. JE number + description). Reverse lookup endpoint:
   `GET /api/engagements/:id/links?targetType=&targetId=` → WPs referencing it.
2. UI: LinksPanel on WP page (add via type+searchable picker); "Referenced in" chip on
   JE/sample/risk views.
**Acceptance:**
- [ ] Tests: link validation (cross-engagement target → 400), resolution payloads;
      manual: link a JE and a sample to a WP.
