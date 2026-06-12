import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';

describe('audit log', () => {
  let ctx: TestApp;
  let admin: TestUser;
  let manager: TestUser;
  let staff: TestUser;
  let clientId: string;
  let engagementId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await createUserWithLogin(ctx, 'ADMIN');
    manager = await createUserWithLogin(ctx, 'MANAGER');
    staff = await createUserWithLogin(ctx, 'STAFF');

    const client = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { cookie: manager.cookie },
      payload: { name: 'Audit Trail Client' },
    });
    clientId = client.json().id;

    const engagement = await ctx.app.inject({
      method: 'POST',
      url: '/api/engagements',
      headers: { cookie: manager.cookie },
      payload: {
        clientId,
        name: 'FY2026 audit',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
      },
    });
    engagementId = engagement.json().id;
    await ctx.app.inject({
      method: 'POST',
      url: `/api/engagements/${engagementId}/members`,
      headers: { cookie: manager.cookie },
      payload: { userId: staff.user.id },
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function globalLog() {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/audit-log?pageSize=500',
      headers: { cookie: admin.cookie },
    });
    return res.json().items as Array<{
      action: string;
      entityType: string;
      entityId: string;
      userId: string | null;
      changes: Record<string, [unknown, unknown]> | null;
    }>;
  }

  it('records a field-level diff when a client is updated', async () => {
    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/clients/${clientId}`,
      headers: { cookie: manager.cookie },
      payload: { industry: 'Mining' },
    });
    const rows = await globalLog();
    const row = rows.find(
      (r) => r.entityType === 'Client' && r.action === 'UPDATE' && r.entityId === clientId,
    );
    expect(row).toBeDefined();
    expect(row?.userId).toBe(manager.user.id);
    expect(row?.changes).toEqual({ industry: [null, 'Mining'] });
  });

  it('records failed logins with a null user id', async () => {
    await ctx.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: admin.user.email, password: 'wrong-wrong-wrong' },
    });
    const rows = await globalLog();
    const row = rows.find((r) => r.action === 'LOGIN_FAILED' && r.entityId === admin.user.email);
    expect(row).toBeDefined();
    expect(row?.userId).toBeNull();
  });

  it('exposes engagement-scoped history to MANAGER+ members only', async () => {
    await ctx.app.inject({
      method: 'POST',
      url: `/api/engagements/${engagementId}/status`,
      headers: { cookie: manager.cookie },
      payload: { target: 'FIELDWORK' },
    });

    const asManager = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${engagementId}/audit-log`,
      headers: { cookie: manager.cookie },
    });
    expect(asManager.statusCode).toBe(200);
    const statusRow = asManager
      .json()
      .items.find((r: { action: string }) => r.action === 'STATUS');
    expect(statusRow.changes).toEqual({ status: ['PLANNING', 'FIELDWORK'] });

    // STAFF member: engagement visible, but log restricted (403, not 404).
    const asStaff = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${engagementId}/audit-log`,
      headers: { cookie: staff.cookie },
    });
    expect(asStaff.statusCode).toBe(403);
  });

  it('restricts the global log to ADMIN and paginates newest-first', async () => {
    const asManager = await ctx.app.inject({
      method: 'GET',
      url: '/api/audit-log',
      headers: { cookie: manager.cookie },
    });
    expect(asManager.statusCode).toBe(403);

    const page = await ctx.app.inject({
      method: 'GET',
      url: '/api/audit-log?page=1&pageSize=1',
      headers: { cookie: admin.cookie },
    });
    expect(page.json().items).toHaveLength(1);
    expect(page.json().total).toBeGreaterThanOrEqual(5);
  });

  it('has no mutation routes for audit rows', async () => {
    const patch = await ctx.app.inject({
      method: 'PATCH',
      url: '/api/audit-log/some-id',
      headers: { cookie: admin.cookie },
    });
    const del = await ctx.app.inject({
      method: 'DELETE',
      url: '/api/audit-log/some-id',
      headers: { cookie: admin.cookie },
    });
    expect(patch.statusCode).toBe(404);
    expect(del.statusCode).toBe(404);
  });
});
