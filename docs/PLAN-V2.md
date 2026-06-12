# Scrutiny — Post-v1.0 Roadmap: Big-4 Platform Parity (v2)

> Status: **approved roadmap, not yet executable.** Prerequisite: every v1.0 task in
> [PROGRESS.md](./PROGRESS.md) is `✅ done` and v1.0 is tagged.
> When v1.0 ships, each phase below gets a detailed task file in `docs/phases/`
> (PHASE-10 …) through the `[plan-change]` process, and PROGRESS.md gains its tasks.
> The execution model of [PLAN.md §3](./PLAN.md) applies unchanged — including the
> machine-enforced guardrails.

---

## 1. Benchmark: what the Big 4 actually run

v1.0 makes Scrutiny comparable to mid-market tools (CaseWare Working Papers + IDEA).
The Big 4 run integrated cloud platforms whose differentiators are **methodology-driven
workflow, client collaboration, full-population analytics, group audit orchestration,
and quality management** — not better lead schedules:

| Firm | Platform | Known differentiators |
|---|---|---|
| EY | Canvas (+ Helix analytics) | Methodology-embedded workflow, client portal, group instructions, full-GL analyzers |
| PwC | Aura (+ Halo data auditing, Connect portal) | Risk-driven work programs, milestone discipline, data auditing at population scale |
| Deloitte | Omnia (+ Argus AI document review) | Integrated analytics, AI-assisted document review, global delivery model |
| KPMG | Clara (+ Clara analytics & client collaboration) | One workflow + analytics + collaboration surface, ISQM-aligned monitoring |
| (cross-firm) | Thomson Reuters Confirmation | External confirmations at scale |

The v2 goal: an open-source, self-hosted platform a firm can credibly run where these
five capability pillars exist today only in proprietary stacks.

## 2. Parity gap map (v1.0 → v2 phases)

| Capability pillar | Big-4 reference | Scrutiny v2 phase |
|---|---|---|
| Scale, SSO, security hardening, background jobs | all platforms | 10 |
| Methodology engine: risk → tailored audit programs | Canvas / Aura / Omnia / Clara core | 11 |
| Client PBC portal & collaboration | PwC Connect, Clara collaboration, Canvas portal | 12 |
| External confirmations workflow | Confirmation.com | 13 |
| ERP data acquisition + full-population analytics | Helix, Halo, IDEA at scale | 14 |
| FS preparation, disclosure checklists, tie-out | CaseWare Financials class, embedded checklists | 15 |
| Group audits, multi-currency, consolidation | Canvas/Omnia group modules (ISA 600R) | 16 |
| Quality management: EQCR, independence, monitoring | ISQM-1 tooling inside Clara/Aura/Omnia | 17 |
| Budgets, milestones, staffing economics | embedded practice management | 18 |
| AI assistance with human-in-the-loop gates | Argus-class document review, GenAI copilots | 19 |

## 3. Phases

Sizing is indicative (task counts comparable to v1 phases). Dependencies listed per
phase; otherwise phases may be planned in the order below.

### Phase 10 — Scale & security platform (depends: v1.0)

The technical substrate every later phase needs.

- PostgreSQL as a first-class datasource (Prisma provider switch; SQLite stays for
  single-auditor installs; migration tool SQLite → Postgres).
- OIDC single sign-on + TOTP MFA; session/device management; password policy.
- RBAC v2: engagement-level roles decoupled from firm roles (e.g. STAFF globally,
  in-charge on one engagement); permission matrix documented and tested.
- Background job runner (pg-boss) for imports, analytics, exports, reminders.
- Attachments on S3-compatible object storage (MinIO default) with local-disk fallback.
- Hardening: rate limiting, security headers, encryption-at-rest guidance, secrets
  handling, dependency audit in CI; structured logs + Prometheus metrics.
- **Outcome:** 50 concurrent users / 10M-row GL imports without degradation; pen-test
  checklist passes.

### Phase 11 — Methodology engine & smart audit programs (depends: 10)

The heart of Big-4 platforms: the risk assessment *drives* the file.

- Procedure library: ISA-mapped audit procedures (content as data, firm-editable,
  versioned) tagged by FSLI, assertion, and risk level.
- Work program generation: RMM grid (v1 Phase 4) → tailored program per FSLI; manual
  tailoring with documented rationale; regeneration on risk changes with diff view.
- Tailoring questionnaires (entity profile: industry, first-year, IT environment) that
  scope programs in/out.
- Procedure execution = working papers with structured conclusions (per-procedure
  sign-off feeding Phase 7 chains).
- Methodology content packs: import/export, semantic versioning, firm customization
  layer that survives pack upgrades.
- **Outcome:** assessing a risk HIGH automatically proposes the responsive procedures;
  an unaddressed assertion is visibly flagged on the completion checklist.

### Phase 12 — Client collaboration portal (depends: 10)

- External user type (client contact) with hard tenant isolation and zero access to
  audit content beyond their requests.
- PBC request lists (template-able, roll-forwardable) with owners, due dates,
  reminders, and status (requested → uploaded → accepted/rejected).
- Secure uploads straight into the engagement binder inbox; acceptance files them as
  attachments with provenance.
- Threaded comments per request; client-facing dashboard; auditor-facing aging view.
- **Outcome:** a full PBC cycle happens inside Scrutiny — no email attachments.

### Phase 13 — Confirmations (depends: 10; portal reuse from 12 optional)

- Templates: bank, AR, AP, legal, related-party (editable, multi-language ready).
- Batch generation to PDF with engagement letterhead; address book per client.
- Register: sent / reminded / received / exception / no-reply with dates and evidence.
- Exceptions link to misstatements (Phase 8); no-replies link to alternative-procedure
  working papers.
- Optional SMTP dispatch + unique reply-tracking codes (no third-party dependency).
- **Outcome:** the confirmation register replaces the firm's Excel tracker end to end.

### Phase 14 — Data acquisition & population-scale analytics (depends: 10)

Helix/Halo-class capability, self-hosted.

- Columnar analytics engine: DuckDB embedded beside the OLTP store; GL/subledger data
  lands in Parquet; analytics run as background jobs.
- ERP extraction kits: documented export recipes + tolerant parsers for SAP (ACDOCA/
  BSEG exports), Oracle GL, Dynamics, NetSuite, Accurate/Zahir (regional relevance).
- Composite JE risk scoring across the full population (rule ensemble + statistical
  outliers + user/time/account profiling), explainable per entry.
- Subledger analytics: AR aging rebuild + DSO trends, AP duplicate-payment detection,
  inventory movement analysis, payroll reasonableness.
- Substantive analytics workbench: expectation models (regression / trend) with
  precision and threshold math per ISA 520, auto-documented into working papers.
- Revenue analytics: cutoff testing, credit-note patterns, channel mix shifts.
- **Outcome:** 100M GL lines scored in one run on a 16 GB host; every analytic emits a
  signed-off-able working paper, not just a grid.

### Phase 15 — Financial statement suite (depends: 10)

- FS builder: statements + notes editor (structured blocks bound to FSLI/adjusted TB
  values — numbers always live, never typed).
- Tie-out: every FS figure cross-referenced to leadsheet/TB with drill-down; stale or
  unticked figures block completion.
- Disclosure checklist engine with pluggable content packs (IFRS, ETAP/regional GAAP);
  responses link to notes; open items block archive.
- Version compare (blackline) between FS drafts; PDF export with firm styling.
- Optional iXBRL tagging/export (lifts the v1 non-goal).
- **Outcome:** the audited FS package is produced and tied out inside Scrutiny.

### Phase 16 — Group audits & multi-currency (depends: 14, 15)

- Multi-currency engagements: per-account currencies, closing/average-rate translation,
  CTA computation per DOMAIN-defined math (extends the v1 single-currency rule).
- Component registry with ISA 600 (Revised) scoping: significance, work allocation
  (full / specific procedures / analytical), component materiality allocator.
- Group instructions: packaged requests to component teams with deadlines and
  deliverables; component auditor workspace (restricted portal reusing Phase 12 infra).
- Reporting flow: component conclusions/clearance memos roll up to a group evaluation
  dashboard; consolidation view with eliminations and group-level adjustments.
- **Outcome:** a 10-component group audit is orchestrated, evidenced, and concluded in
  one place.

### Phase 17 — Quality management & compliance (depends: 11)

- EQCR workflow: assignment rules (listed/risk criteria), reviewer workspace, EQCR
  sign-off gating archive; ISA 220R role checks.
- Independence: per-engagement confirmations for all members, firm conflicts register,
  rotation tracking (partner tenure clocks).
- Consultation log with required-resolution gating for flagged matters.
- Deadlines: configurable archive countdown (e.g. 60 days after report date) with
  escalating alerts; report-date discipline.
- Firm monitoring (ISQM 1): cross-engagement dashboards — overdue sign-offs, open
  review notes, archive breaches, methodology versions in use; root-cause tagging.
- Inspection support: one-click regulator export (read-only binder bundle with audit
  log and hash manifest).
- **Outcome:** an ISQM-1-shaped monitoring story a firm can show an inspector.

### Phase 18 — Practice management bridge (depends: 17)

- Budgets per engagement area (hours/fees) vs. actuals; simple timesheet capture or
  CSV import from external time systems.
- Milestone plans (planning complete, fieldwork start, report date…) with engagement
  and firm calendar views.
- Staffing: allocation vs. availability, conflict warnings, utilization and
  realization reporting.
- **Outcome:** partners see status, economics, and bottlenecks without leaving Scrutiny.

### Phase 19 — AI assistance layer (depends: 11, 14; explicitly lifts the v1 non-goal)

Argus-class document intelligence and copilots — pluggable and inspectable.

- Provider-agnostic gateway (self-hosted models first-class; cloud APIs optional);
  per-firm config; nothing leaves the host by default.
- Document intelligence: contracts/minutes/agreements summarized into draft working
  papers with page-anchored citations.
- Risk suggestion: TB movements + analytics findings → proposed risk assessments with
  rationale (never auto-accepted).
- Anomaly narratives: plain-language explanations attached to Phase 14 scores.
- Disclosure pre-screening: checklist answers proposed from the draft FS.
- Governance: every AI output is PROPOSED until a human accepts it; immutable AI-usage
  log (model, prompt class, reviewer) for inspection; red-team test set in CI.
- **Outcome:** measurable preparation-time reduction with zero unreviewed AI content in
  any signed working paper.

## 4. Architecture evolution (decided now, detailed at phase planning)

- **Database:** Postgres primary for firms; SQLite remains supported for solo use.
  One schema, two providers; provider-specific SQL isolated behind services.
- **Jobs:** pg-boss (Postgres) with in-process fallback (SQLite installs).
- **Files:** S3-compatible storage (MinIO bundled in compose); content-addressed as in
  v1.
- **Analytics:** DuckDB + Parquet sidecar; OLTP data never mutated by analytics.
- **Tenancy:** stays single-firm per instance (sovereignty > SaaS economics); the
  Phase 12/16 portals are scoped external surfaces of the same instance.
- **API:** `/api` remains internal; Phase 10 adds a versioned `/api/v1` public surface
  + webhooks once SSO lands.
- All of this lands in ARCHITECTURE.md via `[plan-change]` when each phase is detailed.

## 5. Sequencing & indicative size

```
v1.0 ─ 10 ─┬─ 11 ─┬─ 17 ── 18
           ├─ 12 ─┼─ 13
           ├─ 14 ─┼─ 16 (also needs 15)
           ├─ 15 ─┘
           └─ (11,14) ── 19
```

| Phase | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|---|---|---|---|---|---|
| Indicative tasks | 8 | 8 | 6 | 5 | 10 | 7 | 8 | 7 | 5 | 8 |

≈ 72 tasks — a similar magnitude to v1.0. Milestone tags: v2.1 after Phase 12
(collaboration), v2.2 after Phase 14 (analytics), v2.3 after Phase 16 (group audits),
v3.0 after Phase 19.

## 6. Non-goals (still out, even for v2)

- Multi-tenant SaaS control plane, billing, marketplace.
- Tax preparation/compliance engines; bookkeeping/ERP features.
- Becoming a qualified e-signature or KYC provider (integrate, don't build).
- Real-time live ERP connectors with write access (extraction is read-only, file-based
  or read-only API pulls).
- Replacing professional judgment — AI outputs never self-approve (Phase 19 governance).

## 7. Governance

This document is protected by the guard like PLAN.md. Turning any phase into
executable work requires, via the `[plan-change]` process: (1) a detailed
`docs/phases/PHASE-NN-*.md` with tasks/acceptance in the v1 format, (2) PROGRESS.md
rows, (3) DOMAIN.md additions for any new audit math (e.g. CTA translation, component
materiality allocation, ISA 520 precision formulas) — pinned with worked examples
before any code, and (4) a regenerated plan manifest.
