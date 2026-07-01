# Phase 12 — Client Collaboration Portal (PBC)

Goal: the entire provided-by-client cycle happens inside Scrutiny — request lists,
secure uploads, acceptance into the binder, reminders. External users see nothing but
their own requests.

Read first: DOMAIN-V2.md §3 (PBC state machine); ARCHITECTURE.md §5 (auth).

---

### T-12.1 — External identity & portal auth
**Prereqs:** T-10.8
**Files:** Prisma `ClientContact` + migration;
`apps/server/src/plugins/portal-auth.ts`;
`apps/server/src/modules/portal/{auth-routes.ts,+tests}`
**Steps:**
1. `ClientContact`: id, clientId, email (unique), name, passwordHash, isActive,
   mfa optional (reuse T-10.4 helpers), timestamps. NOT a `User` — zero overlap with
   firm roles.
2. Separate cookie `scrutiny_portal_token` + JWT audience `portal`; portal auth
   plugin guards `/api/portal/*` only, firm auth never accepts portal tokens and vice
   versa (explicit audience check — test both cross-uses fail 401).
3. Contact management (firm side): CRUD under `/api/clients/:id/contacts` (MANAGER+),
   invite flow: create → one-time set-password token (24h) → portal login.
4. Isolation guard helper `requireContactClient(contact, clientId)`; every portal
   handler resolves data strictly through `contact.clientId` — never from params.
**Acceptance:**
- [ ] Tests: portal login/logout/me; firm token on portal route → 401 and portal
      token on firm route → 401; invite token single-use + expiry; deactivated
      contact blocked.

### T-12.2 — PBC models
**Prereqs:** T-12.1
**Files:** Prisma `PbcList`, `PbcRequest`, `PbcRequestFile`, `PbcComment` + migration;
`packages/shared/src/schemas/pbc.ts`
**Steps:**
1. `PbcList`: id, engagementId, name, isTemplate (firm-level reusable when true,
   engagementId null). `PbcRequest`: id, listId, title, description?, fsliCode?,
   dueDate?, assignedContactId?, status per DOMAIN-V2 §3, sortOrder, timestamps.
   `PbcRequestFile`: id, requestId, storedName, fileName, sizeBytes, uploadedByContactId,
   status (`PENDING`|`ACCEPTED`|`REJECTED`), rejectReason?, acceptedAttachmentId?.
   `PbcComment`: id, requestId, authorType (`FIRM`|`CLIENT`), authorId, text, createdAt.
2. Zod schemas incl. the status enum; state-machine transition validator as a pure
   shared function `canTransitionPbc(from, to)` (+unit tests for every edge).
**Acceptance:**
- [ ] Migration applies; transition validator tests cover the full DOMAIN-V2 §3
      matrix (legal and illegal moves).

### T-12.3 — Auditor-side API & UI
**Prereqs:** T-12.2
**Files:** `apps/server/src/modules/pbc/{service.ts,routes.ts,+tests}`;
`apps/web/src/pages/pbc/{PbcPage.tsx,PbcRequestDialog.tsx}`
**Steps:**
1. Endpoints under `/api/engagements/:id/pbc`: lists CRUD, requests CRUD (MEMBER+ per
   DOMAIN-V2 §1), bulk-create from a template list, roll-forward source (Phase 9
   service retrofit: copy lists as templates with dates shifted +1 year), assign
   contact, aging summary (`?aging=true`: overdue/soon/ok counts per DOMAIN-V2 §3).
2. UI: engagement tab "PBC" — list board grouped by status, overdue highlighted,
   request dialog (title, FSLI, due date, contact), template picker.
**Acceptance:**
- [ ] Route tests: CRUD + access + archivedGuard, template instantiation copies rows,
      aging math on crafted dates. Component test: overdue badge rendering.

### T-12.4 — Portal API & UI
**Prereqs:** T-12.3
**Files:** `apps/server/src/modules/portal/{pbc-routes.ts,+tests}`;
`apps/web/src/portal/{main.tsx,PortalApp.tsx,RequestsPage.tsx,RequestDetail.tsx}`;
`apps/web/portal.html`; vite config (second input)
**Steps:**
1. Portal endpoints (`/api/portal/pbc`): list own client's open engagements' requests,
   request detail, `POST /:rid/files` (multipart, reuses storage driver; sets request
   UPLOADED), comments (append). Isolation: every query joins through
   `contact.clientId` (add a regression test attempting another client's request id →
   404).
2. Separate Vite entry `portal.html` → minimal chrome (logo, request list, no firm
   nav); reuses ui components; served at `/portal` (static plugin route mapping).
**Acceptance:**
- [ ] Tests: upload flips status; cross-client access 404; comment append-only.
      Manual: portal login → see requests → upload → comment.

### T-12.5 — Acceptance into the binder
**Prereqs:** T-12.4
**Files:** `apps/server/src/modules/pbc/accept-service.ts` (+tests); UI on request
detail (firm side)
**Steps:**
1. `POST .../pbc/requests/:rid/files/:fid/accept {workingPaperId?}` (MEMBER+):
   copies the stored object into an engagement `Attachment` (existing Phase 7 model)
   on the chosen WP (default: section-inbox WP auto-created per FSLI section),
   records provenance (`sourcePbcFileId`), marks file ACCEPTED; request becomes
   ACCEPTED when all its files are resolved and ≥1 accepted.
   `POST .../reject {reason}` → file REJECTED, request back to REJECTED state
   (client re-submits per DOMAIN-V2 §3).
2. Audit log entries for accept/reject; attachments show "from client upload" chip.
**Acceptance:**
- [ ] Tests: accept copies bytes (hash-identical) + provenance row; reject requires
      reason; request status transitions per state machine; archived engagement 409.

### T-12.6 — Reminders & notifications
**Prereqs:** T-12.5
**Files:** `apps/server/src/jobs/handlers/pbc-reminders.ts` (+tests); SMTP mailer
`apps/server/src/lib/mailer.ts`; env + ops docs; in-app badge queries
**Steps:**
1. Mailer: nodemailer with SMTP env config; `MAIL_ENABLED=false` default → mailer
   no-ops but records `MailOutbox` rows (model: to, subject, body, sentAt?) so tests
   and airgapped installs still work.
2. Daily job (pg-boss cron / fallback interval): due-in-3-days and overdue reminders
   to assigned contacts (one mail per contact digest), escalation copy to engagement
   LEAD on 7+ days overdue. Idempotent per day (dedupe key).
3. Firm UI: PBC tab badge (overdue count); portal shows due chips.
**Acceptance:**
- [ ] Tests: crafted dates yield exact outbox rows, dedupe prevents double-send on
      re-run, disabled mail still records outbox.
