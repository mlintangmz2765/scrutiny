# Phase 13 — External Confirmations

Goal: replace the Excel confirmation tracker — templates, batch PDF generation, a
lifecycle register, exceptions feeding misstatements, no-replies feeding alternative
procedures.

Read first: DOMAIN-V2.md §3 (confirmation state machine); DOMAIN.md §9.

---

### T-13.1 — Models, templates & seed
**Prereqs:** T-10.8
**Files:** Prisma `ConfirmationTemplate`, `Confirmation` + migration;
`packages/shared/src/schemas/confirmation.ts`; seed extension
**Steps:**
1. `ConfirmationTemplate`: id, type (`BANK`|`AR`|`AP`|`LEGAL`|`RELATED_PARTY`), name,
   subject, body (markdown with placeholders: {clientName}, {counterpartyName},
   {periodEnd}, {amount}, {replyCode}, {auditorName}), isBuiltin. Seed one builtin
   template per type (professional English wording).
2. `Confirmation`: id, engagementId, templateId, type, counterpartyName,
   counterpartyEmail?, counterpartyAddress?, amount? (BigInt), currencyCode,
   replyCode (unique, 10-char random), status per DOMAIN-V2 §3, sentAt?, remindedAt?,
   respondedAt?, responseAttachmentId?, misstatementId?, altProcedureWpId?, notes?,
   timestamps.
3. Shared transition validator `canTransitionConfirmation(from, to)` (+unit tests all
   edges, incl. evidence requirements encoded as a `requirements(to)` helper).
**Acceptance:**
- [ ] Seed idempotent (5 builtin templates); validator matrix fully tested.

### T-13.2 — Batch creation & PDF generation
**Prereqs:** T-13.1
**Files:** `apps/server/src/modules/confirmations/{pdf.ts,batch-service.ts,+tests}`;
fixture `fixtures/confirmation-batch.csv`
**Steps:**
1. `pdfkit` letter renderer: firm letterhead block (firm name/address from new
   `FirmSettings` singleton model — add it: name, address, logo optional),
   placeholder substitution, reply-code footer. `GET .../confirmations/:id/pdf`
   streams the letter; `GET .../confirmations/pdfs?ids=` streams a merged batch.
2. Batch create: `POST /api/engagements/:id/confirmations/batch` from (a) uploaded
   CSV (counterparty, email, address, amount) using the T-02.2 parsing conventions,
   or (b) top-N AR/AP account balances (adjusted balances by FSLI A.2/L.1 mapped
   accounts as the amount source). Each row → DRAFT confirmation.
3. Validate PDFs in tests with `pdf-parse`: assert counterparty, amount (formatted),
   and reply code appear in extracted text.
**Acceptance:**
- [ ] CSV batch of 3 creates 3 DRAFTs with exact amounts; PDF text assertions pass;
      bad CSV rows reported without partial silent drops.

### T-13.3 — Register API & UI
**Prereqs:** T-13.2
**Files:** `apps/server/src/modules/confirmations/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/confirmations/ConfirmationsPage.tsx`
**Steps:**
1. Endpoints under `/api/engagements/:id/confirmations`: list (filter type/status,
   aging buckets by sentAt), detail, `POST /:cid/transition {to, ...evidence}`
   enforcing the shared validator + evidence requirements (RECEIVED needs
   responseAttachmentId — upload endpoint included; dates stamped server-side).
   MEMBER+ record, LEAD sends (DRAFT→SENT).
2. UI: register table (type, counterparty, amount, status chips, days outstanding),
   bulk select → mark SENT / print batch, detail drawer with timeline + evidence
   upload.
**Acceptance:**
- [ ] Route tests: every legal transition with evidence, every illegal one 400/409;
      aging math; role gates. Component test: bulk selection payload.

### T-13.4 — Exceptions & alternative procedures
**Prereqs:** T-13.3
**Files:** `apps/server/src/modules/confirmations/followup-service.ts` (+tests);
completion checklist retrofit; UI actions
**Steps:**
1. EXCEPTION transition requires either linking an existing misstatement or inline
   creation (delegates to Phase 8 service; difference amount prefilled from
   response vs book amount when provided).
2. NO_REPLY transition auto-creates the alternative-procedures WP stub (section by
   type: BANK→C, AR→D, AP→H) titled "Alternative procedures — {counterparty}", links
   it; WP must reach PREPARED sign-off for the completion rule.
3. New computed completion item per DOMAIN-V2 §3: no confirmation left SENT/REMINDED;
   EXCEPTION resolved (misstatement linked); NO_REPLY has signed-off alt-procedures WP.
**Acceptance:**
- [ ] Tests: exception without linkage 400, no-reply creates linked WP, completion
      item satisfied/unsatisfied on crafted registers; archive gating verified.

### T-13.5 — Optional dispatch & response intake
**Prereqs:** T-13.4
**Files:** `apps/server/src/jobs/handlers/confirmation-dispatch.ts` (+tests); mailer
reuse; register UI send actions; ops docs
**Steps:**
1. `POST .../confirmations/:cid/send-email` (LEAD; requires counterpartyEmail):
   enqueues mail with the PDF attached via T-12.6 mailer/outbox; DRAFT→SENT stamped;
   reminders job (7/14 days, dedupe) mirroring PBC reminder mechanics → REMINDED.
2. Response intake stays manual (upload on the register — external reply portals are
   out of scope); replyCode printed on letters enables matching; document in
   `docs/user-guide/confirmations.md`.
**Acceptance:**
- [ ] Tests: send enqueues outbox row with PDF attachment metadata + stamps SENT;
      reminder job dedupe; user-guide page exists.
