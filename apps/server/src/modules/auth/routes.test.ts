import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';

describe('auth & user routes', () => {
  let ctx: TestApp;
  let admin: TestUser;
  let staff: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await createUserWithLogin(ctx, 'ADMIN');
    staff = await createUserWithLogin(ctx, 'STAFF');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('logs in with valid credentials and sets the auth cookie', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: admin.user.email, password: admin.password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).not.toHaveProperty('passwordHash');
    const cookie = res.cookies.find((c) => c.name === 'scrutiny_token');
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: admin.user.email, password: 'definitely-wrong' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects malformed login bodies with VALIDATION_ERROR', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'not-an-email', password: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the current user on /me with a cookie', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: staff.cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().email).toBe(staff.user.email);
  });

  it('returns 401 on /me without a cookie', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('clears the cookie on logout', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: staff.cookie },
    });
    expect(res.statusCode).toBe(204);
    const cleared = res.cookies.find((c) => c.name === 'scrutiny_token');
    expect(cleared?.value).toBe('');
  });

  it('denies user administration to non-admins (403)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: staff.cookie },
      payload: {
        email: 'new@test.local',
        name: 'New',
        password: 'long-enough-password',
        role: 'STAFF',
      },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('lets ADMIN create and update users', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/users',
      headers: { cookie: admin.cookie },
      payload: {
        email: 'managed@test.local',
        name: 'Managed',
        password: 'long-enough-password',
        role: 'STAFF',
      },
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;

    const updated = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/users/${id}`,
      headers: { cookie: admin.cookie },
      payload: { role: 'MANAGER' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().role).toBe('MANAGER');
  });

  it('denies the user list to STAFF but allows MANAGER+', async () => {
    const denied = await ctx.app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { cookie: staff.cookie },
    });
    expect(denied.statusCode).toBe(403);

    const allowed = await ctx.app.inject({
      method: 'GET',
      url: '/api/users',
      headers: { cookie: admin.cookie },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().total).toBeGreaterThanOrEqual(2);
  });

  it('requires auth on every /api route by default (global hook)', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/users' });
    expect(res.statusCode).toBe(401);
  });
});
