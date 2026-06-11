# Scrutiny — Architecture & Conventions

This document defines **how** the system is built. It is binding: do not deviate without a
recorded decision in `docs/DECISIONS.md` (create if missing, one dated entry per decision).

---

## 1. Stack (fixed)

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) everywhere | `"strict": true`, no `any`, no `@ts-ignore` |
| Runtime | Node.js ≥ 22 LTS | |
| Package manager | pnpm ≥ 9, workspaces | Single lockfile at repo root |
| Backend | Fastify 5 | REST + JSON only |
| ORM | Prisma 6 | |
| Database | SQLite (file `./data/scrutiny.db`) | Single-firm deployment; no Postgres in v1 |
| Validation | Zod | All API inputs and parsed files validated with Zod |
| Frontend | React 19 + Vite 6 | SPA. Vite 7 needs Node ≥ 20.19 — see DECISIONS.md |
| Routing (web) | React Router | |
| Server state (web) | TanStack Query | |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) | Plain Tailwind; small shared UI components in `apps/web/src/components/ui/` |
| Charts | Recharts | Used from Phase 5 onward |
| Excel/CSV | `exceljs` (xlsx read/write), `csv-parse` (streaming CSV) | |
| Auth | `@fastify/jwt` + `@fastify/cookie`, httpOnly cookie | bcrypt for password hashing |
| Unit/integration tests | Vitest | Server endpoints tested via `app.inject()` |
| E2E tests | Playwright (Phase 9 only) | |
| Lint/format | ESLint 9 (flat config) + Prettier | |
| CI | GitHub Actions | lint → typecheck → test → build |

Use the latest stable version of each at install time; never downgrade a major version to
dodge an error — fix the error.

## 2. Repository layout

```
scrutiny/
├── CLAUDE.md                  # Instructions for AI agents
├── README.md
├── LICENSE                    # AGPL-3.0
├── package.json               # Root: scripts fan out to workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc.json
├── .github/workflows/ci.yml
├── docs/                      # All planning + reference docs (this folder)
├── fixtures/                  # Sample CSV/XLSX files used by tests AND manual demos
├── data/                      # Runtime data: SQLite db, uploaded files (gitignored)
├── packages/
│   └── shared/                # Zod schemas, shared types, pure domain functions
│       └── src/
│           ├── schemas/       # Zod schemas per module (one file per module)
│           ├── domain/        # Pure functions: materiality, benford, sampling, ratios
│           └── index.ts       # Re-exports everything
└── apps/
    ├── server/
    │   ├── prisma/schema.prisma
    │   └── src/
    │       ├── app.ts         # buildApp(): registers plugins + routes, no listen()
    │       ├── server.ts      # entry point: buildApp().listen({ port: 3001 })
    │       ├── plugins/       # auth, prisma, error-handler, audit-log
    │       ├── modules/<name>/# routes.ts, service.ts, service.test.ts, routes.test.ts
    │       └── test/helpers.ts# createTestApp(): app + throwaway SQLite db
    └── web/
        └── src/
            ├── main.tsx, App.tsx, routes.tsx
            ├── lib/api.ts     # typed fetch wrapper (credentials: 'include')
            ├── components/    # shared components; ui/ for primitives
            └── pages/<area>/  # one folder per module (clients, engagements, tb, ...)
```

Module = vertical slice. Backend code for trial balance lives in
`apps/server/src/modules/trial-balance/`; its UI in `apps/web/src/pages/trial-balance/`;
its schemas in `packages/shared/src/schemas/trial-balance.ts`; pure math in
`packages/shared/src/domain/`.

## 3. Root scripts (defined in Phase 0, then never renamed)

```jsonc
// package.json (root)
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",          // server on :3001, web on :5173
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "eslint . --max-warnings 0",      // single flat config at repo root
    "typecheck": "pnpm -r typecheck",
    "db:migrate": "pnpm -C apps/server prisma migrate dev",
    "db:seed": "pnpm -C apps/server prisma db seed"
  }
}
```

Vite dev server proxies `/api` → `http://localhost:3001`. In production the server serves
the built web app statically (configured in Phase 9).

## 4. API conventions

- Base path `/api`. Resource-oriented REST:
  `GET /api/clients`, `POST /api/clients`, `GET /api/clients/:id`,
  `PATCH /api/clients/:id`, `DELETE /api/clients/:id`.
- Engagement-scoped resources are nested one level:
  `/api/engagements/:engagementId/trial-balance`, `/api/engagements/:engagementId/journal-entries`.
- All request bodies validated with Zod schemas from `packages/shared`. Invalid → `400`.
- Response envelope: success returns the resource or `{ "items": [...], "total": n }` for
  lists. Errors return `{ "error": { "code": "STRING_CODE", "message": "Human readable" } }`.
- Status codes: 200 read/update, 201 create, 204 delete, 400 validation, 401 unauthenticated,
  403 forbidden, 404 not found, 409 conflict (e.g. writing to an archived engagement).
- All list endpoints accept `?page=1&pageSize=50` (max pageSize 500) and return `total`.
- IDs are Prisma `cuid()` strings.

## 5. Auth & roles

- Login: `POST /api/auth/login {email, password}` → sets httpOnly cookie `scrutiny_token`
  (JWT, 12h expiry). `POST /api/auth/logout` clears it. `GET /api/auth/me` returns user.
- Roles (global, on User): `ADMIN`, `PARTNER`, `MANAGER`, `STAFF`.
  - ADMIN: manage users.
  - PARTNER: everything in engagements they are a member of + final sign-off + archive.
  - MANAGER: everything except archive and partner sign-off.
  - STAFF: read/write working papers and fieldwork data; cannot approve JEs, cannot sign off
    as reviewer.
- Every non-auth route requires authentication (Fastify `onRequest` hook in the auth
  plugin). Role checks live in services, not in route handlers.
- Engagement membership: users only see engagements they are members of (ADMIN sees all).

## 6. Money, numbers, dates (CRITICAL — bugs here are catastrophic)

- **All monetary amounts are integers in minor units** (e.g. cents; for IDR the minor unit
  is 1 rupiah). Never `float`/`double` for money.
- DB: Prisma `BigInt` columns. Application boundary: convert to JS `number` immediately
  after reading, with `assertSafeAmount(n)` (throws unless `Number.isSafeInteger`). JSON
  carries plain numbers. Helper lives in `packages/shared/src/domain/money.ts`.
- Each engagement has `currencyCode` (ISO 4217) and `minorUnitsPerMajor` (e.g. 100 for USD,
  1 for IDR). Display formatting happens only in the web app.
- Rounding rule for derived amounts (materiality, projections): round half away from zero
  to an integer minor unit — single helper `roundHalfAwayFromZero(x: number): number`. All
  domain functions use it; no ad-hoc `Math.round`.
- Percentages are stored as decimal fractions in `number` (e.g. 0.05 for 5%) — they are not
  money.
- Debits positive, credits negative in every stored signed `amount`. When a model uses
  separate `debit`/`credit` columns both are non-negative and at most one is non-zero.
- Dates: store as Prisma `DateTime` (UTC). Fiscal period boundaries are dates, not
  datetimes — store as `DateTime` at 00:00:00 UTC, transmit as `YYYY-MM-DD` strings.

## 7. Testing strategy

- **Pure domain functions** (`packages/shared/src/domain/`): exhaustive unit tests against
  the worked examples in DOMAIN.md. Exact-value assertions, no tolerances except where
  DOMAIN.md gives a tolerance.
- **Server**: every module has `service.test.ts` (unit, against a throwaway DB) and
  `routes.test.ts` (integration via `app.inject()`, includes auth + role failures).
- **Test DB helper** (`apps/server/src/test/helpers.ts`): `createTestApp()` creates a
  unique temp SQLite file, runs `prisma db push` once per process (or applies cached
  schema), returns `{ app, prisma, cleanup }`. Tests never share state; each file gets a
  fresh db.
- **Web**: Vitest + Testing Library smoke tests for pages with logic (forms, grids).
  Heavy UI testing is deferred to the Phase 9 Playwright suite.
- **Fixtures** under `/fixtures` are committed and shared by tests and the demo seed.

## 8. Error handling & audit log

- Central Fastify error handler plugin maps thrown `AppError(code, statusCode, message)` to
  the error envelope; unexpected errors → 500 with code `INTERNAL` (message not leaked),
  logged with stack.
- Audit log (Phase 1): plugin records `{userId, action, entityType, entityId, timestamp,
  changes}` for every create/update/delete that goes through services. Append-only table;
  no API to modify it.
- Archived engagements are read-only: a guard in the engagement-scoped services throws
  `409 ENGAGEMENT_ARCHIVED` for any mutation.

## 9. Coding standards

- ESLint + Prettier defaults; no custom style debates. `eslint --max-warnings 0`.
- No `any`, no non-null assertions (`!`) except in tests, no `@ts-ignore`.
- Services contain logic; route handlers only parse/validate/delegate/serialize.
- Pure calculation code goes in `packages/shared/src/domain/` so it is testable without a
  DB and reusable by the web app.
- Comments explain constraints ("ISA 530 requires…"), not narration of the code.
- UI strings: English, sentence case. No i18n framework in v1.
