# Phase 17 — Quality Management & Compliance (ISQM-class)

Goal: EQCR workflow, independence, rotation clocks, consultations, archive deadlines,
firm-level monitoring, and a one-click inspection bundle.

Read first: DOMAIN-V2.md §12 (all rules — implement exactly); DOMAIN.md §10–§11.

---

### T-17.1 — EQCR workflow
**Prereqs:** T-11.8
**Files:** Engagement columns (`requiresEqcr`, `eqcrReviewerId?`, riskRating);
Signoff level extension (`EQCR_REVIEWED`); module
`apps/server/src/modules/quality/{eqcr-service.ts,routes.ts,+tests}`; UI on
engagement overview + WP sign-off chain
**Steps:**
1. `requiresEqcr` derived per DOMAIN-V2 §12 flags (isPublicInterest from entity
   profile, riskRating HIGH set at planning, isFirstYearAudit) with LEAD override
   ON only (can add EQCR, never remove a derived requirement — test).
2. EQCR reviewer assignment (PARTNER role, not a member, ≠ any signing partner on
   the engagement — validated); reviewer gets read access + review-note rights
   WITHOUT membership (extend requireEngagementAccess for the eqcrReviewerId case).
3. New sign-off level `EQCR_REVIEWED` above PARTNER_REVIEWED on WPs flagged
   `requiresPartnerSignoff`, plus an engagement-level EQCR conclusion record;
   archive gate: when requiresEqcr, conclusion + flagged-WP EQCR sign-offs present.
**Acceptance:**
- [ ] Tests: derivation flags, reviewer eligibility rules (member/partner/self all
      rejected), access without membership, archive gating both ways.

### T-17.2 — Independence declarations & conflicts register
**Prereqs:** T-17.1
**Files:** Prisma `IndependenceDeclaration`, `ConflictEntry` + migration; quality
module extension (+tests); UI: member banner + declaration form; ADMIN conflicts page
**Steps:**
1. Declaration per (engagement, user): status (`CONFIRMED`|`THREAT`), threatText?,
   safeguardText?, acceptedByLeadAt? — rules per DOMAIN-V2 §12: first sign-off by a
   member without a declaration → 409 `INDEPENDENCE_MISSING`; THREAT unaccepted →
   409 `INDEPENDENCE_THREAT`.
2. Firm conflicts register (ADMIN): client ↔ user/relative/financial-interest rows,
   free-text nature; engagement creation warns (non-blocking) when a member matches
   a register row for that client.
3. UI: yellow banner "declare independence" until done; LEAD acceptance queue.
**Acceptance:**
- [ ] Sign-off blocked/unblocked exactly per rules (test both codes); warning
      surfaced in creation response payload; declarations immutable once accepted
      (new row supersedes).

### T-17.3 — Partner rotation clocks
**Prereqs:** T-17.2
**Files:** `apps/server/src/modules/quality/{rotation-service.ts,+tests}`;
FirmSettings params; report endpoint + UI card on ClientsPage detail
**Steps:**
1. Tenure computation per DOMAIN-V2 §12: consecutive years where the user was the
   signing partner (PARTNER_REVIEWED signer on the archived engagement, or the
   engagement's designated signingPartnerId — add that column, set at planning) for
   the same client; gaps reset.
2. Params: warnYears (5), blockYears (7). Warn = flagged in reports + engagement
   creation response; block = adding that partner as signingPartner → 409
   `ROTATION_BLOCK`.
3. `GET /api/quality/rotation` (PARTNER+): per client-partner tenure table.
**Acceptance:**
- [ ] Tenure unit tests: consecutive, gap-reset, boundary at 5/7; block enforced on
      assignment; report shape asserted on fixtures.

### T-17.4 — Consultation log
**Prereqs:** T-17.3
**Files:** Prisma `Consultation` + migration; quality module (+tests); engagement UI
tab section
**Steps:**
1. `Consultation`: id, engagementId, topic, question, consultedName/role,
   conclusion?, status (`OPEN`|`RESOLVED`), requiredBeforeArchive (bool), raisedById,
   resolvedById?, timestamps. MEMBER+ raise; LEAD resolve (conclusion mandatory).
2. Completion/archive gate: zero OPEN consultations with requiredBeforeArchive.
3. UI: list + dialog on the engagement Quality tab.
**Acceptance:**
- [ ] Resolve requires conclusion (400); archive gating parametrized test; audit
      log rows on raise/resolve.

### T-17.5 — Report date, milestones & archive countdown
**Prereqs:** T-17.4
**Files:** Engagement columns (`reportDate?`, `archiveDueDate?` derived); Prisma
`Milestone` + migration; job handler `jobs/handlers/deadline-alerts.ts` (+tests);
UI: overview timeline card + firm calendar page
**Steps:**
1. Setting reportDate (LEAD, COMPLETION stage) computes archiveDueDate = reportDate
   + archiveDays param (default 60, FirmSettings). Escalation job per DOMAIN-V2 §12
   (LEAD at 14, PARTNER at 7, ADMIN on breach) via mailer/outbox + in-app notices;
   idempotent per day.
2. Breach recording: immutable `DeadlineBreach` row (engagementId, dueDate,
   archivedAt?, rootCause from the fixed ISQM_ROOT_CAUSES list — set later by
   PARTNER; required before the breach row counts as reviewed).
3. Milestones: name, dueDate, doneAt per engagement (seeded defaults: planning
   complete, fieldwork start/end, report date, archive due); firm calendar view
   (month grid listing milestones/deadlines across engagements the user can see).
**Acceptance:**
- [ ] Countdown math + escalation targets on crafted dates (exact outbox rows);
      breach rows immutable; calendar endpoint respects engagement visibility.

### T-17.6 — Firm monitoring dashboard (ISQM 1)
**Prereqs:** T-17.5
**Files:** `apps/server/src/modules/quality/{monitoring-service.ts,+tests}`;
`apps/web/src/pages/quality/FirmMonitoringPage.tsx`
**Steps:**
1. `GET /api/quality/monitoring` (PARTNER/ADMIN): firm-wide KPIs — engagements by
   stage, overdue sign-offs (WPs prepared > 14d without review), open review notes
   > 7d, archive countdown/breaches (with root-cause completeness), EQCR pending,
   independence missing, methodology pack versions in use per engagement.
2. Every KPI drills down to a filtered list endpoint (ids + deep links).
3. Dashboard UI: KPI cards + drill-down tables; breach root-cause tagging control
   (PARTNER; writes the DeadlineBreach.rootCause).
**Acceptance:**
- [ ] Each KPI computed exactly on a crafted multi-engagement fixture; visibility:
      PARTNER sees all, MANAGER 403; root-cause write path tested.

### T-17.7 — Inspection export bundle
**Prereqs:** T-17.6
**Files:** `apps/server/src/modules/quality/{inspection-export.ts,+tests}`; job
handler; UI button on archived engagement
**Steps:**
1. `POST /api/engagements/:id/inspection-export` (PARTNER, ARCHIVED only): job
   builds a zip — working papers rendered to standalone HTML (markdown → HTML,
   sign-off blocks, links resolved to relative paths), attachments (original
   bytes), audit log CSV, SUM/TB/FS exports (Phase 8/15), AI usage log when Phase 19
   present, and `manifest.json` with sha256 of every file + the archive-record hash.
2. `GET .../inspection-export/:jobId` downloads; bundle is reproducible: two runs on
   the same archived engagement produce identical manifests (timestamps normalized).
3. Verify script `scripts/verify-inspection-bundle.mjs` (recompute hashes) for the
   regulator side; documented in `docs/user-guide/quality.md`.
**Acceptance:**
- [ ] Bundle test: manifest hashes verify byte-exact; reproducibility (two runs,
      equal manifests); non-archived engagement 409; verify script passes on the
      fixture bundle and fails on a tampered file.
