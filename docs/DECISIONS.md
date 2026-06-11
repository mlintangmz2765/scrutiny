# Decisions Log

Dated deviations from ARCHITECTURE.md / phase files, per PLAN.md §3. Newest first.

## 2026-06-12 — Vite 6 instead of Vite 7; Node engines >=20.16

Vite 7 requires Node ≥ 20.19 / ≥ 22.12; the local development machine runs Node 20.16.
Pinned `vite@^6` in `apps/web` and set root `engines.node` to `>=20.16`. CI runs Node 22
(`.nvmrc`). Revisit when local Node is upgraded.

## 2026-06-12 — Lint runs once at the repo root

Per-package `lint` scripts were dropped: one ESLint 9 flat config at the root covers all
workspaces and the root script is `eslint . --max-warnings 0`. Reason: pnpm does not
expose root devDependency binaries to workspace scripts reliably, and one config avoids
drift. ARCHITECTURE.md §3 updated to match.

## 2026-06-12 — User.role is a String column, not a Prisma enum

Prisma does not support enums on SQLite. Roles are stored as `String` and validated by
the Zod enum `userRoleSchema` in `@scrutiny/shared` (the option anticipated in T-00.5).
The same approach applies to every future "enum" column (engagement status, JE status…).

## 2026-06-12 — `/design` gallery route

Added a design-system gallery page (`apps/web/src/pages/DesignGalleryPage.tsx`) rendering
every UI primitive with the tokens from docs/DESIGN.md. It is living documentation for
later phases; keep it updated when adding components to `components/ui/`.

## 2026-06-12 — DATABASE_URL relative path

Prisma resolves relative SQLite paths from the schema directory
(`apps/server/prisma/`), so the repo-root database is `file:../../../data/scrutiny.db`
(three levels up, not two). `.env.example` and the server's dev fallback use this value.
