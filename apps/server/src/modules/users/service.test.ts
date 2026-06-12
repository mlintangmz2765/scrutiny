import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppError } from '../../lib/app-error.js';
import { createTestApp, type TestApp } from '../../test/helpers.js';
import {
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  verifyPassword,
} from './service.js';

describe('users service', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('creates a user and never exposes the password hash', async () => {
    const user = await createUser(ctx.prisma, {
      email: 'staff@scrutiny.local',
      name: 'Staff One',
      password: 'long-enough-password',
      role: 'STAFF',
    });
    expect(user.email).toBe('staff@scrutiny.local');
    expect(user.isActive).toBe(true);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate emails with EMAIL_TAKEN', async () => {
    await expect(
      createUser(ctx.prisma, {
        email: 'staff@scrutiny.local',
        name: 'Duplicate',
        password: 'long-enough-password',
        role: 'STAFF',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN', statusCode: 409 } satisfies Partial<AppError>);
  });

  it('rejects short passwords', async () => {
    await expect(
      createUser(ctx.prisma, {
        email: 'short@scrutiny.local',
        name: 'Short',
        password: 'too-short',
        role: 'STAFF',
      }),
    ).rejects.toThrow();
  });

  it('verifies correct and rejects wrong passwords', async () => {
    expect(await verifyPassword(ctx.prisma, 'staff@scrutiny.local', 'long-enough-password')).not.toBeNull();
    expect(await verifyPassword(ctx.prisma, 'staff@scrutiny.local', 'wrong-password-123')).toBeNull();
    expect(await verifyPassword(ctx.prisma, 'nobody@scrutiny.local', 'whatever-pass')).toBeNull();
  });

  it('blocks login for deactivated users', async () => {
    const user = await createUser(ctx.prisma, {
      email: 'leaver@scrutiny.local',
      name: 'Leaver',
      password: 'long-enough-password',
      role: 'MANAGER',
    });
    await deactivateUser(ctx.prisma, user.id);
    expect(await verifyPassword(ctx.prisma, 'leaver@scrutiny.local', 'long-enough-password')).toBeNull();
  });

  it('resets passwords so the old one stops working', async () => {
    const user = await createUser(ctx.prisma, {
      email: 'reset@scrutiny.local',
      name: 'Reset',
      password: 'original-password',
      role: 'STAFF',
    });
    await updateUser(ctx.prisma, user.id, { password: 'brand-new-password' });
    expect(await verifyPassword(ctx.prisma, 'reset@scrutiny.local', 'original-password')).toBeNull();
    expect(await verifyPassword(ctx.prisma, 'reset@scrutiny.local', 'brand-new-password')).not.toBeNull();
  });

  it('paginates the user list with a correct total', async () => {
    const all = await listUsers(ctx.prisma, { page: 1, pageSize: 100 });
    const page = await listUsers(ctx.prisma, { page: 1, pageSize: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(all.total);
    expect(all.total).toBeGreaterThanOrEqual(3);
  });
});
