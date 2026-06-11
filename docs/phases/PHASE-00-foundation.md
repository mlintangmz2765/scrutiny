# Phase 0 — Foundation

Goal: a working empty monorepo — server answers `/api/health`, web renders a page, shared
package builds, CI green. No business logic.

Read first: [ARCHITECTURE.md](../ARCHITECTURE.md) §1–§3, §7.

---

### T-00.1 — Repo scaffolding & tooling
**Prereqs:** none
**Files:** `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`,
`.prettierrc.json`, `.editorconfig`, `.gitignore`, `.nvmrc`
**Steps:**
1. Root `package.json`: `"private": true`, name `scrutiny`, scripts exactly as
   ARCHITECTURE.md §3, `packageManager` field set to the installed pnpm version.
2. `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
3. `tsconfig.base.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`,
   `module: NodeNext` (apps may override `module` for bundlers), `skipLibCheck: true`.
4. ESLint 9 flat config covering all workspaces (typescript-eslint recommended), Prettier
   config, `.gitignore` covering `node_modules`, `dist`, `data/`, `*.db`, `.env`,
   `coverage`, `playwright-report`.
5. `.nvmrc` with the Node LTS major (e.g. `22`).
**Acceptance:**
- [ ] `pnpm install` succeeds at root.
- [ ] `git status` shows no ignored junk (no `node_modules` staged).

### T-00.2 — `packages/shared` scaffold
**Prereqs:** T-00.1
**Files:** `packages/shared/package.json`, `tsconfig.json`, `vitest.config.ts`,
`src/index.ts`, `src/domain/money.ts`, `src/domain/money.test.ts`
**Steps:**
1. Package name `@scrutiny/shared`, scripts: `build` (tsc), `test` (vitest run), `lint`,
   `typecheck` (tsc --noEmit). Add `zod` dependency.
2. Implement `assertSafeAmount(n: number): void` and
   `roundHalfAwayFromZero(x: number): number` per ARCHITECTURE.md §6.
3. Tests: `roundHalfAwayFromZero(2.5)=3`, `(-2.5)=-3`, `(617283.9)=617284`,
   `(2.4)=2`, `(-2.4)=-2`; `assertSafeAmount(2**53)` throws, `(2**53-1)` does not,
   `(1.5)` throws (non-integer).
**Acceptance:**
- [ ] `pnpm -C packages/shared test` passes.
- [ ] `pnpm lint && pnpm typecheck` pass at root.

### T-00.3 — `apps/server` scaffold (Fastify)
**Prereqs:** T-00.2
**Files:** `apps/server/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/app.ts`,
`src/server.ts`, `src/modules/health/routes.ts`, `src/modules/health/routes.test.ts`
**Steps:**
1. Dependencies: `fastify`, `@scrutiny/shared` (workspace), dev: `tsx`, `vitest`.
   Scripts: `dev` (`tsx watch src/server.ts`), `build` (tsc), `start`, `test`, `lint`,
   `typecheck`.
2. `buildApp()` in `app.ts` registers routes and returns the Fastify instance without
   listening. `server.ts` listens on port 3001 (env `PORT` override).
3. `GET /api/health` → `200 {"status":"ok"}`.
4. Test via `buildApp()` + `app.inject()`.
**Acceptance:**
- [ ] `pnpm -C apps/server test` passes.
- [ ] `pnpm -C apps/server dev` then `curl http://localhost:3001/api/health` returns
      `{"status":"ok"}` (verify manually, then stop the server).

### T-00.4 — `apps/web` scaffold (React + Vite + Tailwind)
**Prereqs:** T-00.3
**Files:** `apps/web/` via `pnpm create vite` (react-ts template), plus Tailwind 4 via
`@tailwindcss/vite`, `src/lib/api.ts`, smoke test `src/App.test.tsx`
**Steps:**
1. Scripts: `dev`, `build` (tsc -b && vite build), `test` (vitest run), `lint`, `typecheck`.
2. Vite config: `server.proxy = { '/api': 'http://localhost:3001' }`.
3. `App.tsx` renders heading "Scrutiny" and fetches `/api/health`, showing "API: ok" when
   reachable (don't fail render when not).
4. `api.ts`: `apiFetch<T>(path, init?)` — prefixes `/api`, sets `credentials: 'include'`,
   throws `ApiError` with parsed error envelope on non-2xx.
5. Smoke test with Testing Library + jsdom: renders heading.
**Acceptance:**
- [ ] `pnpm -C apps/web test` and `pnpm -C apps/web build` pass.
- [ ] With both dev servers running, http://localhost:5173 shows "Scrutiny" and "API: ok".

### T-00.5 — Prisma + SQLite
**Prereqs:** T-00.3
**Files:** `apps/server/prisma/schema.prisma`, `src/plugins/prisma.ts`,
`src/test/helpers.ts`, `.env.example`
**Steps:**
1. Add `prisma`, `@prisma/client`. Datasource sqlite, url from `DATABASE_URL`
   (default `file:../../data/scrutiny.db` — document in `.env.example`).
2. Single model for now: `User` (id cuid, email unique, name, passwordHash, role enum
   ADMIN/PARTNER/MANAGER/STAFF, createdAt, updatedAt). Note: SQLite has no native enums —
   Prisma enums work on SQLite via validation; if the Prisma version rejects enums on
   SQLite, use `String` fields + Zod enums and record this in docs/DECISIONS.md.
3. `prisma migrate dev --name init` → commit the migration folder.
4. Prisma Fastify plugin: decorates `app.prisma`, disconnects on close.
5. `createTestApp()` per ARCHITECTURE.md §7: temp db file in `os.tmpdir()`, apply schema
   with `prisma db push --skip-generate` (spawn once per test process), return
   `{ app, prisma, cleanup }`. Convert one health test to use it as proof.
**Acceptance:**
- [ ] `pnpm db:migrate` creates `data/scrutiny.db`.
- [ ] `pnpm -C apps/server test` passes using the helper.

### T-00.6 — CI (GitHub Actions)
**Prereqs:** T-00.5
**Files:** `.github/workflows/ci.yml`
**Steps:**
1. Trigger on push + PR. Steps: checkout, setup pnpm + Node (from `.nvmrc`, with pnpm
   cache), `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`,
   `pnpm -C apps/server exec prisma generate`, `pnpm test`, `pnpm build`.
**Acceptance:**
- [ ] Workflow file passes `actionlint` if available; otherwise YAML parses and the exact
      command sequence above runs green locally.

### T-00.7 — README, LICENSE, CONTRIBUTING
**Prereqs:** T-00.1
**Files:** `README.md` (update), `LICENSE`, `CONTRIBUTING.md`
**Steps:**
1. LICENSE: full AGPL-3.0 text from https://www.gnu.org/licenses/agpl-3.0.txt.
2. README: what Scrutiny is, feature list (from PLAN.md §2), quickstart
   (`pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`), license badge.
3. CONTRIBUTING: points contributors to docs/PLAN.md execution model.
**Acceptance:**
- [ ] Files exist, README quickstart commands match real scripts.
