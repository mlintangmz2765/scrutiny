# Phase 10 — Scale & Security Platform

Goal: PostgreSQL support, SSO + MFA, engagement-level roles, background jobs, object
storage, hardening, observability. Every later v2 phase builds on this substrate.

Read first: [PLAN-V2.md](../PLAN-V2.md) §3/§4; [DOMAIN-V2.md](../DOMAIN-V2.md) §1;
ARCHITECTURE.md (v1 conventions still bind).

---

### T-10.1 — PostgreSQL as a second provider
**Prereqs:** T-09.5
**Files:** `scripts/db/generate-postgres-schema.mjs`, `apps/server/prisma/postgres/`
(generated schema + its own `migrations/`), `docker-compose.yml` (postgres service),
`.env.example`, CI job addition, `docs/user-guide/ops.md` (extend)
**Steps:**
1. Script copies `prisma/schema.prisma`, swaps `provider = "sqlite"` →
   `"postgresql"`, writes `prisma/postgres/schema.prisma`; fails if the files drift
   otherwise (diff check ignoring the provider line). Root script `db:gen-pg`.
2. `SCRUTINY_DB=postgres` selects at build/deploy time: `prisma generate/migrate
   --schema prisma/postgres/schema.prisma`. Application code is provider-agnostic —
   audit any raw SQL for dialect assumptions (there should be none; fix if found).
3. Compose gains a `postgres:17` service + named volume; README quickstart variant.
4. CI: second server-test job running against a postgres service container
   (`DATABASE_URL` + pg schema generate; the vitest global-setup pushes to a
   per-run schema instead of a temp file when provider is postgres).
**Acceptance:**
- [ ] `pnpm -C apps/server test` passes locally on SQLite AND in the CI postgres job.
- [ ] Drift check fails when a model exists in only one schema (test the script).

### T-10.2 — Background job runner
**Prereqs:** T-10.1
**Files:** `apps/server/src/jobs/{runner.ts,registry.ts,types.ts,+tests}`, plugin
`src/plugins/jobs.ts`
**Steps:**
1. `pg-boss` when provider is postgres; for SQLite installs an in-process FIFO queue
   with the same interface: `app.jobs.enqueue(name, payload)`, handlers registered in
   `registry.ts`, at-least-once semantics documented.
2. Job rows surfaced via `GET /api/admin/jobs?status=` (ADMIN): id, name, state,
   attempts, error. Retry policy: 3 attempts, exponential backoff.
3. Convert nothing yet — later phases register handlers; ship a `demo-noop` handler
   used only by tests.
**Acceptance:**
- [ ] Tests: enqueue→complete, failing handler retries then dead-letters, list
      endpoint filters by state. Same tests pass under both queue implementations.

### T-10.3 — OIDC single sign-on
**Prereqs:** T-10.2
**Files:** `apps/server/src/modules/auth/oidc.ts` (+tests), auth plugin extension,
`apps/web/src/pages/auth/LoginPage.tsx` (SSO button), `.env.example`
**Steps:**
1. `openid-client`: `GET /api/auth/oidc/login` (redirect w/ PKCE + state cookie),
   `GET /api/auth/oidc/callback` (code exchange, email claim → user lookup).
   Provisioning: `OIDC_AUTO_PROVISION=true` creates STAFF users on first login;
   otherwise unknown emails get 403 `USER_NOT_PROVISIONED`.
2. Existing cookie/JWT session issued on success (no parallel session system).
   Local password login stays; `AUTH_LOCAL_DISABLED=true` hides it.
3. Tests against a local mock issuer (tiny Fastify instance serving
   discovery/JWKS/token endpoints from the test helper).
**Acceptance:**
- [ ] Tests: full code flow with mock issuer, invalid state rejected, unknown email
      behavior per provisioning flag. Manual: login via any real OIDC provider works
      with documented env vars.

### T-10.4 — TOTP MFA
**Prereqs:** T-10.3
**Files:** `apps/server/src/modules/auth/mfa.ts` (+tests), User columns
(`mfaSecret?`, `mfaEnabled`, `mfaRecoveryCodes`), web settings page
`apps/web/src/pages/settings/SecurityPage.tsx`
**Steps:**
1. `otpauth` lib. `POST /api/auth/mfa/enroll` → secret + otpauth URL (QR rendered
   client-side), `POST /api/auth/mfa/activate {code}`, `POST /api/auth/mfa/disable`
   (requires code). Login becomes two-step when enabled: password → short-lived
   pending token → `POST /api/auth/mfa/verify {code}` issues the session cookie.
2. 10 single-use recovery codes (hashed at rest, shown once).
3. `MFA_REQUIRED_ROLES` env (e.g. `ADMIN,PARTNER`) blocks login completion until
   enrolment for those roles.
**Acceptance:**
- [ ] Tests: enroll→activate→login two-step happy path, wrong code, recovery code
      single-use, required-role gate. Time-based codes tested with a fixed epoch.

### T-10.5 — Engagement-level roles (RBAC v2)
**Prereqs:** T-10.4
**Files:** migration (`EngagementMember.engagementRole`), `apps/server/src/lib/authz.ts`
(extend: `requireEngagementRole`), retrofits in engagements/JE/materiality/WP services,
member UI role selector, `packages/shared/src/schemas/engagement.ts` (role enum)
**Steps:**
1. Implement DOMAIN-V2.md §1 exactly: enum, migration backfill (creator→LEAD,
   others→MEMBER), invariant exactly one LEAD (service-enforced on add/remove/change).
2. Retrofit permission checks listed in the §1 matrix; global-role checks remain for
   firm-level actions. Update affected v1 tests rather than weakening them.
3. Member management UI gains a role column + change control (LEAD only).
**Acceptance:**
- [ ] Matrix tests: one test per cell of DOMAIN-V2 §1 (allowed and denied case);
      single-LEAD invariant; migration backfill asserted on seeded data.

### T-10.6 — S3-compatible attachment storage
**Prereqs:** T-10.5
**Files:** `apps/server/src/lib/file-storage.ts` (refactor to interface),
`src/lib/storage/{local.ts,s3.ts}` (+tests), compose MinIO service, migration CLI
`scripts/db/migrate-files-to-s3.mjs`, `.env.example`
**Steps:**
1. `StorageDriver` interface (put/get-stream/delete/exists by sha256 key); local
   driver = current behavior; s3 driver via `@aws-sdk/client-s3`
   (endpoint/bucket/creds from env — MinIO-compatible).
2. Selection via `STORAGE_DRIVER=local|s3`. Upload/download endpoints unchanged.
3. Migration CLI copies local files to the bucket, verifies hashes, reports.
4. S3 tests run against MinIO in CI (service container) and are skipped-with-failure
   (not silently) when `S3_TEST_ENDPOINT` is unset locally — i.e. a clear notice, and
   CI always runs them.
**Acceptance:**
- [ ] Round-trip byte-identical on both drivers; migration CLI verified on fixtures;
      Phase 7 attachment tests still green on the local driver.

### T-10.7 — Hardening
**Prereqs:** T-10.6
**Files:** `apps/server/src/plugins/{security.ts}`, auth plugin (token version),
CI workflow step, `docs/user-guide/security.md`
**Steps:**
1. `@fastify/helmet` (API-appropriate config) + `@fastify/rate-limit` (login: 10/min
   per IP; global: 300/min; 429 envelope).
2. Password policy: min 12 chars for new passwords + block top-1000 list (embedded
   const). Token versioning: `User.tokenVersion` bumped on password change/deactivate;
   JWT carries it; mismatch → 401 (kills old sessions).
3. CI: `pnpm audit --prod --audit-level high` step (fails on high/critical).
4. Security guide: TLS termination, secrets, backup encryption, update policy.
**Acceptance:**
- [ ] Tests: rate-limit 429 after burst, old token invalid after password change,
      weak password rejected. CI audit step green.

### T-10.8 — Observability & load smoke
**Prereqs:** T-10.7
**Files:** `apps/server/src/plugins/metrics.ts`, logger config in `app.ts`,
`scripts/perf/load-smoke.mjs`, `docs/user-guide/ops.md` (extend)
**Steps:**
1. Structured pino logs with request ids and user ids (never bodies/secrets);
   `/api/metrics` Prometheus endpoint (fastify-metrics) behind ADMIN or token env.
2. Slow-request log (> 1s) and slow-query log via Prisma middleware (> 500ms).
3. `load-smoke.mjs` (autocannon): 50 concurrent users against health+login+TB report
   for 30s on seeded demo data; documents thresholds (p95 < 500ms) and prints
   pass/fail. Not in CI; run-book entry in ops.md.
**Acceptance:**
- [ ] Metrics endpoint exposes http histogram; smoke script passes locally on demo
      data with thresholds met (record numbers in the task Notes).
