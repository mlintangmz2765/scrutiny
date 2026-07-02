# Progress Board

Statuses: `⬜ todo` · `🟨 in progress` · `✅ done` · `⛔ blocked (see BLOCKERS.md)`

Update this table when starting and finishing a task. Date format `YYYY-MM-DD`.
A task may only start when every prerequisite task is `✅ done`.

| Task | Title | Prereqs | Status | Done date |
|---|---|---|---|---|
| T-00.1 | Repo scaffolding & tooling | — | ✅ done | 2026-06-12 |
| T-00.2 | packages/shared scaffold | T-00.1 | ✅ done | 2026-06-12 |
| T-00.3 | apps/server scaffold | T-00.2 | ✅ done | 2026-06-12 |
| T-00.4 | apps/web scaffold | T-00.3 | ✅ done | 2026-06-12 |
| T-00.5 | Prisma + SQLite | T-00.3 | ✅ done | 2026-06-12 |
| T-00.6 | CI (GitHub Actions) | T-00.5 | ✅ done | 2026-06-12 |
| T-00.7 | README, LICENSE, CONTRIBUTING | T-00.1 | ✅ done | 2026-06-12 |
| T-01.1 | User service & seed | T-00.5 | ✅ done | 2026-06-12 |
| T-01.2 | Auth plugin & endpoints | T-01.1 | ✅ done | 2026-06-12 |
| T-01.3 | Web: login + app shell | T-01.2 | ✅ done | 2026-06-12 |
| T-01.4 | Clients API | T-01.2 | ✅ done | 2026-06-12 |
| T-01.5 | Clients UI | T-01.3, T-01.4 | ✅ done | 2026-06-12 |
| T-01.6 | Engagements API | T-01.4 | ✅ done | 2026-06-12 |
| T-01.7 | Engagements UI | T-01.5, T-01.6 | ✅ done | 2026-06-12 |
| T-01.8 | Audit log | T-01.6 | ✅ done | 2026-06-12 |
| T-02.1 | TB models & FSLI seed | T-01.8 | ✅ done | 2026-07-02 |
| T-02.2 | File parsing service | T-02.1 | ⬜ todo | |
| T-02.3 | Import API | T-02.2 | ⬜ todo | |
| T-02.4 | Import UI | T-02.3, T-01.7 | ⬜ todo | |
| T-02.5 | Mapping API + auto-suggest | T-02.3 | ⬜ todo | |
| T-02.6 | Mapping UI | T-02.4, T-02.5 | ⬜ todo | |
| T-02.7 | TB views | T-02.6 | ⬜ todo | |
| T-03.1 | JE models | T-02.7 | ⬜ todo | |
| T-03.2 | JE service & API | T-03.1 | ⬜ todo | |
| T-03.3 | JE UI | T-03.2 | ⬜ todo | |
| T-03.4 | Adjusted TB view | T-03.3 | ⬜ todo | |
| T-03.5 | Lead schedules | T-03.4 | ⬜ todo | |
| T-04.1 | Materiality domain function | T-02.7 | ⬜ todo | |
| T-04.2 | Materiality API + UI | T-04.1 | ⬜ todo | |
| T-04.3 | Risk model & API | T-04.2 | ⬜ todo | |
| T-04.4 | Risk UI | T-04.3 | ⬜ todo | |
| T-04.5 | Planning analytics suggestions | T-04.3, T-03.5 | ⬜ todo | |
| T-05.1 | GL import | T-03.5 | ⬜ todo | |
| T-05.2 | Ratio & variance analytics | T-04.5 | ⬜ todo | |
| T-05.3 | Benford analysis | T-05.1 | ⬜ todo | |
| T-05.4 | JE testing rules engine | T-05.1 | ⬜ todo | |
| T-05.5 | JE testing UI | T-05.4 | ⬜ todo | |
| T-06.1 | Sampling domain functions | T-05.5 | ⬜ todo | |
| T-06.2 | MUS evaluation | T-06.1 | ⬜ todo | |
| T-06.3 | Sampling API | T-06.2 | ⬜ todo | |
| T-06.4 | Sampling UI | T-06.3 | ⬜ todo | |
| T-07.1 | WP models & binder seed | T-04.4 | ⬜ todo | |
| T-07.2 | File storage & attachments | T-07.1 | ⬜ todo | |
| T-07.3 | WP API & sign-off rules | T-07.2 | ⬜ todo | |
| T-07.4 | Binder UI | T-07.3 | ⬜ todo | |
| T-07.5 | Review notes | T-07.3 | ⬜ todo | |
| T-07.6 | Cross-references | T-07.3, T-06.4 | ⬜ todo | |
| T-08.1 | Misstatements & SUM domain | T-06.4, T-07.6 | ⬜ todo | |
| T-08.2 | SUM API + UI | T-08.1 | ⬜ todo | |
| T-08.3 | Excel exports | T-08.2 | ⬜ todo | |
| T-08.4 | Draft financial statements | T-08.3 | ⬜ todo | |
| T-08.5 | Completion checklist & archive | T-08.4 | ⬜ todo | |
| T-09.1 | Roll-forward | T-08.5 | ⬜ todo | |
| T-09.2 | Docker & static serving | T-09.1 | ⬜ todo | |
| T-09.3 | Backups & ops docs | T-09.2 | ⬜ todo | |
| T-09.4 | Playwright E2E happy path | T-09.3 | ⬜ todo | |
| T-09.5 | User guide & v1.0 release | T-09.4, T-09.8 | ⬜ todo | |
| T-09.6 | Practice company dataset & seed | T-09.1 | ⬜ todo | |
| T-09.7 | Practice reset & sandbox safeguards | T-09.6 | ⬜ todo | |
| T-09.8 | Student workbook & self-check key | T-09.7, T-09.4 | ⬜ todo | |
| T-10.1 | PostgreSQL as a second provider | T-09.5 | ⬜ todo | |
| T-10.2 | Background job runner | T-10.1 | ⬜ todo | |
| T-10.3 | OIDC single sign-on | T-10.2 | ⬜ todo | |
| T-10.4 | TOTP MFA | T-10.3 | ⬜ todo | |
| T-10.5 | Engagement-level roles (RBAC v2) | T-10.4 | ⬜ todo | |
| T-10.6 | S3-compatible attachment storage | T-10.5 | ⬜ todo | |
| T-10.7 | Hardening | T-10.6 | ⬜ todo | |
| T-10.8 | Observability & load smoke | T-10.7 | ⬜ todo | |
| T-11.1 | Methodology models & base pack | T-10.8 | ⬜ todo | |
| T-11.2 | Pack import/export & overlay | T-11.1 | ⬜ todo | |
| T-11.3 | Entity profile & tailoring | T-11.2 | ⬜ todo | |
| T-11.4 | Program generation service | T-11.3 | ⬜ todo | |
| T-11.5 | Program API & UI | T-11.4 | ⬜ todo | |
| T-11.6 | Procedure execution as WPs | T-11.5 | ⬜ todo | |
| T-11.7 | Coverage check & completion | T-11.6 | ⬜ todo | |
| T-11.8 | Roll-forward & pack upgrades | T-11.7 | ⬜ todo | |
| T-12.1 | External identity & portal auth | T-10.8 | ⬜ todo | |
| T-12.2 | PBC models | T-12.1 | ⬜ todo | |
| T-12.3 | Auditor-side API & UI | T-12.2 | ⬜ todo | |
| T-12.4 | Portal API & UI | T-12.3 | ⬜ todo | |
| T-12.5 | Acceptance into the binder | T-12.4 | ⬜ todo | |
| T-12.6 | Reminders & notifications | T-12.5 | ⬜ todo | |
| T-13.1 | Confirmation models & templates | T-10.8 | ⬜ todo | |
| T-13.2 | Batch creation & PDF generation | T-13.1 | ⬜ todo | |
| T-13.3 | Register API & UI | T-13.2 | ⬜ todo | |
| T-13.4 | Exceptions & alternative procedures | T-13.3 | ⬜ todo | |
| T-13.5 | Optional dispatch & response intake | T-13.4 | ⬜ todo | |
| T-14.1 | DuckDB sidecar & Parquet lake | T-10.8 | ⬜ todo | |
| T-14.2 | ERP extraction kits | T-14.1 | ⬜ todo | |
| T-14.3 | Large-import hardening & progress | T-14.2 | ⬜ todo | |
| T-14.4 | Composite JE risk scoring engine | T-14.3 | ⬜ todo | |
| T-14.5 | Scoring UI | T-14.4 | ⬜ todo | |
| T-14.6 | Subledger analytics (AR/AP) | T-14.5 | ⬜ todo | |
| T-14.7 | Revenue analytics | T-14.6 | ⬜ todo | |
| T-14.8 | Substantive analytics workbench | T-14.7 | ⬜ todo | |
| T-14.9 | Analytics auto-documentation | T-14.8 | ⬜ todo | |
| T-14.10 | Performance acceptance & benchmarks | T-14.9 | ⬜ todo | |
| T-15.1 | FS models & binding resolver | T-10.8 | ⬜ todo | |
| T-15.2 | FS builder API | T-15.1 | ⬜ todo | |
| T-15.3 | FS builder UI | T-15.2 | ⬜ todo | |
| T-15.4 | Tie-out | T-15.3 | ⬜ todo | |
| T-15.5 | Disclosure checklist engine | T-15.4 | ⬜ todo | |
| T-15.6 | Blackline & PDF export | T-15.5 | ⬜ todo | |
| T-15.7 | Optional iXBRL export | T-15.6 | ⬜ todo | |
| T-16.1 | Multi-currency & translation math | T-14.10, T-15.7 | ⬜ todo | |
| T-16.2 | Translated views & exports | T-16.1 | ⬜ todo | |
| T-16.3 | Component registry & scoping | T-16.2 | ⬜ todo | |
| T-16.4 | Component materiality allocator | T-16.3 | ⬜ todo | |
| T-16.5 | Group instructions & workspace | T-16.4 | ⬜ todo | |
| T-16.6 | Component reporting & clearance | T-16.5 | ⬜ todo | |
| T-16.7 | Consolidation & eliminations | T-16.6 | ⬜ todo | |
| T-16.8 | Group evaluation & archive gating | T-16.7 | ⬜ todo | |
| T-17.1 | EQCR workflow | T-11.8 | ⬜ todo | |
| T-17.2 | Independence & conflicts register | T-17.1 | ⬜ todo | |
| T-17.3 | Partner rotation clocks | T-17.2 | ⬜ todo | |
| T-17.4 | Consultation log | T-17.3 | ⬜ todo | |
| T-17.5 | Report date, milestones & countdown | T-17.4 | ⬜ todo | |
| T-17.6 | Firm monitoring dashboard | T-17.5 | ⬜ todo | |
| T-17.7 | Inspection export bundle | T-17.6 | ⬜ todo | |
| T-18.1 | Budgets & time capture | T-17.7 | ⬜ todo | |
| T-18.2 | Timesheets & approval | T-18.1 | ⬜ todo | |
| T-18.3 | Milestone & deadline calendar | T-18.2 | ⬜ todo | |
| T-18.4 | Staffing & utilization | T-18.3 | ⬜ todo | |
| T-18.5 | Engagement economics dashboard | T-18.4 | ⬜ todo | |
| T-19.1 | AI provider gateway | T-11.8, T-14.10 | ⬜ todo | |
| T-19.2 | Governance core & red-team suite | T-19.1 | ⬜ todo | |
| T-19.3 | Document ingestion & extraction | T-19.2 | ⬜ todo | |
| T-19.4 | Summarization to draft WPs | T-19.3 | ⬜ todo | |
| T-19.5 | Risk suggestion copilot | T-19.4 | ⬜ todo | |
| T-19.6 | Anomaly narratives | T-19.5 | ⬜ todo | |
| T-19.7 | Disclosure pre-screening | T-19.6 | ⬜ todo | |
| T-19.8 | AI usage reporting & inspection | T-19.7 | ⬜ todo | |
