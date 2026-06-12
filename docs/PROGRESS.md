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
| T-01.4 | Clients API | T-01.2 | ⬜ todo | |
| T-01.5 | Clients UI | T-01.3, T-01.4 | ⬜ todo | |
| T-01.6 | Engagements API | T-01.4 | ⬜ todo | |
| T-01.7 | Engagements UI | T-01.5, T-01.6 | ⬜ todo | |
| T-01.8 | Audit log | T-01.6 | ⬜ todo | |
| T-02.1 | TB models & FSLI seed | T-01.8 | ⬜ todo | |
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
| T-09.5 | User guide & v1.0 release | T-09.4 | ⬜ todo | |
