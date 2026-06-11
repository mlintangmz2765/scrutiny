# Phase 1 — Auth, Clients, Engagements, Audit Log

Goal: users can log in; clients and engagements exist with membership and status workflow;
every mutation is audit-logged.

Read first: ARCHITECTURE.md §4–§6, §8; DOMAIN.md §1.

---

### T-01.1 — User service & seed
**Prereqs:** T-00.5
**Files:** `apps/server/src/modules/users/{service.ts,service.test.ts}`,
`apps/server/prisma/seed.ts`, `packages/shared/src/schemas/user.ts`
**Steps:**
1. Zod schemas: `userCreateSchema` (email, name, password ≥ 10 chars, role),
   `userPublicSchema` (no passwordHash). Export types.
2. Service: `createUser` (bcrypt hash, cost 12), `verifyPassword`, `listUsers`, `getUser`,
   `updateUser` (no password change in v1 except by ADMIN reset), `deactivateUser`
   (add `isActive Boolean @default(true)` to User; never hard-delete users).
3. Seed: admin user `admin@scrutiny.local` / password `admin-change-me-now` (log a warning
   at server start while this password still verifies).
4. Migration for `isActive`.
**Acceptance:**
- [ ] Service tests cover: create, duplicate email rejected, verifyPassword true/false,
      deactivate blocks login path (flag false).
- [ ] `pnpm db:seed` creates the admin (idempotent — running twice doesn't duplicate).

### T-01.2 — Auth plugin & endpoints
**Prereqs:** T-01.1
**Files:** `apps/server/src/plugins/auth.ts`,
`apps/server/src/modules/auth/{routes.ts,routes.test.ts}`,
`apps/server/src/plugins/error-handler.ts`
**Steps:**
1. Error-handler plugin first: `AppError(code, statusCode, message)` class +
   `setErrorHandler` mapping to the envelope (ARCHITECTURE.md §8). Zod errors → 400
   `VALIDATION_ERROR` with issue summary.
2. Auth plugin: `@fastify/cookie` + `@fastify/jwt` (secret from `JWT_SECRET` env;
   `.env.example` updated; refuse to start in production without it, generate dev default
   otherwise). Decorate `app.authenticate` onRequest hook: verifies cookie `scrutiny_token`,
   attaches `request.user = {id, role}`; 401 `UNAUTHENTICATED` on failure. Apply to every
   route except `/api/health` and `/api/auth/login` (register a global hook with an
   allowlist — do NOT rely on per-route opt-in).
3. Routes: `POST /api/auth/login` (sets cookie, 12h, httpOnly, sameSite lax, secure in
   prod), `POST /api/auth/logout`, `GET /api/auth/me`. Inactive users cannot log in.
4. Users admin routes: `GET/POST /api/users`, `PATCH /api/users/:id` — ADMIN only
   (`403 FORBIDDEN` otherwise).
**Acceptance:**
- [ ] Integration tests: login ok, wrong password 401, /me with/without cookie,
      logout clears, non-admin hitting POST /api/users gets 403, unknown route under
      /api requires auth (regression test that the global hook catches new routes).

### T-01.3 — Web: login + app shell
**Prereqs:** T-01.2
**Files:** `apps/web/src/pages/auth/LoginPage.tsx`, `src/lib/auth.tsx` (context +
`useAuth`), `src/components/AppShell.tsx`, `src/routes.tsx`
**Steps:**
1. React Router: `/login` public; everything else wrapped in `RequireAuth` which calls
   `/api/auth/me` (TanStack Query) and redirects to `/login` on 401.
2. AppShell: left sidebar (links: Dashboard, Clients, Engagements — grow in later phases),
   top bar with user name + logout button.
3. Login form with error display. After login, navigate to `/`.
**Acceptance:**
- [ ] Component test: LoginPage renders and submits (mock fetch).
- [ ] Manual: login with seeded admin works; logout returns to /login.

### T-01.4 — Clients API
**Prereqs:** T-01.2
**Files:** `packages/shared/src/schemas/client.ts`,
`apps/server/src/modules/clients/{service.ts,routes.ts,service.test.ts,routes.test.ts}`,
Prisma `Client` model + migration
**Steps:**
1. Model: id, name (required), registrationNumber?, industry?, contactName?,
   contactEmail?, notes?, createdAt/updatedAt. Soft delete via `isActive`.
2. CRUD per ARCHITECTURE.md §4 with pagination + `?search=` on name. All roles may read;
   MANAGER+ may create/update; ADMIN may deactivate.
**Acceptance:**
- [ ] Route tests: CRUD happy paths, validation 400, role 403, pagination total correct.

### T-01.5 — Clients UI
**Prereqs:** T-01.3, T-01.4
**Files:** `apps/web/src/pages/clients/{ClientsListPage.tsx,ClientFormDialog.tsx}`
**Steps:**
1. List with search box, paginated table, "New client" button (MANAGER+ only — get role
   from auth context), edit via dialog. TanStack Query mutations invalidate the list.
**Acceptance:**
- [ ] Component test: list renders rows from mocked API; form validates required name.
- [ ] Manual: create/edit a client end to end.

### T-01.6 — Engagements API
**Prereqs:** T-01.4
**Files:** `packages/shared/src/schemas/engagement.ts`,
`apps/server/src/modules/engagements/{service.ts,routes.ts,+tests}`,
Prisma `Engagement`, `EngagementMember` + migration
**Steps:**
1. Engagement: id, clientId, name (e.g. "FY2025 audit"), periodStart, periodEnd (dates,
   end > start), currencyCode (default "USD"), minorUnitsPerMajor (default 100), status
   (PLANNING default), createdAt/updatedAt. Member: engagementId+userId unique, role on
   engagement is the user's global role (no per-engagement override in v1).
2. Status transition endpoint `POST /:id/status {target}` enforcing DOMAIN.md §1 rules
   (forward one step; ADMIN one step back; ARCHIVED terminal). Archive itself is
   implemented fully in Phase 8 — here it must 400 with code `ARCHIVE_VIA_COMPLETION`
   when target is ARCHIVED.
3. Membership endpoints: list/add/remove members (MANAGER+). Visibility rule
   (ARCHITECTURE.md §5): non-members get 404 (not 403) for engagement-scoped resources —
   implement as a shared `requireEngagementAccess(request, engagementId)` helper that
   later modules MUST reuse.
4. `archivedGuard(engagementId)` helper: throws 409 `ENGAGEMENT_ARCHIVED` if status is
   ARCHIVED — later modules MUST call it on every mutation.
**Acceptance:**
- [ ] Tests: CRUD, invalid transition rejected, non-member 404, member added then 200,
      guard helper unit-tested.

### T-01.7 — Engagements UI
**Prereqs:** T-01.5, T-01.6
**Files:** `apps/web/src/pages/engagements/{EngagementsListPage.tsx,EngagementCreatePage.tsx,EngagementLayout.tsx,EngagementOverviewPage.tsx}`
**Steps:**
1. List page (all my engagements, filter by client/status). Create form (pick client,
   name, period, currency).
2. `EngagementLayout`: route `/engagements/:id/*` with tab navigation that later phases
   extend (Overview now; placeholders hidden until features exist). Overview shows status
   with a "Move to next stage" button (role-gated) and member management.
**Acceptance:**
- [ ] Component tests for list + create form validation.
- [ ] Manual: create engagement, add member, advance PLANNING → FIELDWORK.

### T-01.8 — Audit log
**Prereqs:** T-01.6
**Files:** `apps/server/src/plugins/audit-log.ts` or
`apps/server/src/modules/audit-log/{service.ts,routes.ts,+tests}`, Prisma `AuditLog` +
migration
**Steps:**
1. Model: id, userId, action (CREATE/UPDATE/DELETE/STATUS/LOGIN), entityType, entityId,
   engagementId?, changes (JSON string of {field: [old, new]}), createdAt. Append-only.
2. Expose `app.audit.record(...)` decorator; retrofit users/clients/engagements services
   to call it on every mutation (including login success/failure with null userId on
   failure).
3. `GET /api/engagements/:id/audit-log` (MANAGER+) and `GET /api/audit-log` (ADMIN),
   paginated, newest first.
**Acceptance:**
- [ ] Test: updating a client writes one row with the changed fields; log list endpoint
      pages correctly; there is no UPDATE/DELETE route for audit rows.
