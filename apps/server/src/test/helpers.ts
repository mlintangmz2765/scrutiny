import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { UserPublic, UserRole } from '@scrutiny/shared';
import { buildApp } from '../app.js';
import { createUser } from '../modules/users/service.js';

/** The schema-pushed template database created once in global-setup.ts. */
function ensureTemplateDb(): string {
  return inject('templateDb');
}

function toFileUrl(path: string): string {
  return `file:${path.replace(/\\/g, '/')}`;
}

export interface TestUser {
  user: UserPublic;
  /** Value for the `cookie` header on authenticated inject() calls. */
  cookie: string;
  password: string;
}

/** Creates a user with the given role and returns a logged-in session cookie. */
export async function createUserWithLogin(ctx: TestApp, role: UserRole): Promise<TestUser> {
  const email = `${role.toLowerCase()}-${randomUUID()}@test.local`;
  const password = 'test-password-123';
  const user = await createUser(ctx.prisma, { email, name: `${role} user`, password, role });
  const res = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  const cookie = res.cookies.find((c) => c.name === 'scrutiny_token');
  if (!cookie) throw new Error(`Login failed for test user (${res.statusCode}): ${res.body}`);
  return { user, cookie: `scrutiny_token=${cookie.value}`, password };
}

export interface TestApp {
  app: FastifyInstance;
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
}

/** Builds a Fastify app backed by a fresh throwaway SQLite database. */
export async function createTestApp(): Promise<TestApp> {
  const dir = mkdtempSync(join(tmpdir(), 'scrutiny-test-'));
  const dbPath = join(dir, 'test.db');
  copyFileSync(ensureTemplateDb(), dbPath);

  const app = buildApp({ databaseUrl: toFileUrl(dbPath) });
  await app.ready();

  return {
    app,
    prisma: app.prisma,
    cleanup: async () => {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
