import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { archivedGuard } from '../../lib/engagement-access.js';
import { AppError } from '../../lib/app-error.js';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';

describe('engagement routes', () => {
  let ctx: TestApp;
  let admin: TestUser;
  let manager: TestUser;
  let staff: TestUser;
  let outsider: TestUser;
  let clientId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await createUserWithLogin(ctx, 'ADMIN');
    manager = await createUserWithLogin(ctx, 'MANAGER');
    staff = await createUserWithLogin(ctx, 'STAFF');
    outsider = await createUserWithLogin(ctx, 'STAFF');

    const client = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { cookie: manager.cookie },
      payload: { name: 'Engagement Test Client' },
    });
    clientId = client.json().id;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function createEngagementAs(cookie: string) {
    return ctx.app.inject({
      method: 'POST',
      url: '/api/engagements',
      headers: { cookie },
      payload: {
        clientId,
        name: 'FY2026 audit',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        currencyCode: 'IDR',
        minorUnitsPerMajor: 1,
      },
    });
  }

  it('lets MANAGER create an engagement and auto-joins them', async () => {
    const res = await createEngagementAs(manager.cookie);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('PLANNING');
    expect(body.periodStart).toBe('2026-01-01');
    expect(body.clientName).toBe('Engagement Test Client');
    expect(body.memberCount).toBe(1);
  });

  it('denies creation to STAFF and rejects bad periods', async () => {
    const asStaff = await createEngagementAs(staff.cookie);
    expect(asStaff.statusCode).toBe(403);

    const badPeriod = await ctx.app.inject({
      method: 'POST',
      url: '/api/engagements',
      headers: { cookie: manager.cookie },
      payload: {
        clientId,
        name: 'Backwards',
        periodStart: '2026-12-31',
        periodEnd: '2026-01-01',
      },
    });
    expect(badPeriod.statusCode).toBe(400);
  });

  it('hides engagements from non-members with 404 and filters lists', async () => {
    const created = (await createEngagementAs(manager.cookie)).json();

    const asOutsider = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${created.id}`,
      headers: { cookie: outsider.cookie },
    });
    expect(asOutsider.statusCode).toBe(404);

    const outsiderList = await ctx.app.inject({
      method: 'GET',
      url: '/api/engagements',
      headers: { cookie: outsider.cookie },
    });
    expect(outsiderList.json().total).toBe(0);

    const adminList = await ctx.app.inject({
      method: 'GET',
      url: '/api/engagements',
      headers: { cookie: admin.cookie },
    });
    expect(adminList.json().total).toBeGreaterThanOrEqual(2);
  });

  it('grants access after membership is added, and blocks duplicates', async () => {
    const created = (await createEngagementAs(manager.cookie)).json();

    const add = await ctx.app.inject({
      method: 'POST',
      url: `/api/engagements/${created.id}/members`,
      headers: { cookie: manager.cookie },
      payload: { userId: outsider.user.id },
    });
    expect(add.statusCode).toBe(201);

    const nowVisible = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${created.id}`,
      headers: { cookie: outsider.cookie },
    });
    expect(nowVisible.statusCode).toBe(200);

    const duplicate = await ctx.app.inject({
      method: 'POST',
      url: `/api/engagements/${created.id}/members`,
      headers: { cookie: manager.cookie },
      payload: { userId: outsider.user.id },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('ALREADY_MEMBER');
  });

  it('enforces one-step-forward transitions and ADMIN-only backward', async () => {
    const created = (await createEngagementAs(manager.cookie)).json();
    const url = `/api/engagements/${created.id}/status`;

    const skip = await ctx.app.inject({
      method: 'POST',
      url,
      headers: { cookie: manager.cookie },
      payload: { target: 'REVIEW' },
    });
    expect(skip.statusCode).toBe(400);
    expect(skip.json().error.code).toBe('INVALID_STATUS_TRANSITION');

    const forward = await ctx.app.inject({
      method: 'POST',
      url,
      headers: { cookie: manager.cookie },
      payload: { target: 'FIELDWORK' },
    });
    expect(forward.statusCode).toBe(200);
    expect(forward.json().status).toBe('FIELDWORK');

    const backwardAsManager = await ctx.app.inject({
      method: 'POST',
      url,
      headers: { cookie: manager.cookie },
      payload: { target: 'PLANNING' },
    });
    expect(backwardAsManager.statusCode).toBe(403);

    const backwardAsAdmin = await ctx.app.inject({
      method: 'POST',
      url,
      headers: { cookie: admin.cookie },
      payload: { target: 'PLANNING' },
    });
    expect(backwardAsAdmin.statusCode).toBe(200);
    expect(backwardAsAdmin.json().status).toBe('PLANNING');
  });

  it('refuses direct archiving (ARCHIVE_VIA_COMPLETION)', async () => {
    const created = (await createEngagementAs(manager.cookie)).json();
    await ctx.prisma.engagement.update({
      where: { id: created.id },
      data: { status: 'COMPLETION' },
    });

    const res = await ctx.app.inject({
      method: 'POST',
      url: `/api/engagements/${created.id}/status`,
      headers: { cookie: manager.cookie },
      payload: { target: 'ARCHIVED' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('ARCHIVE_VIA_COMPLETION');
  });

  it('makes archived engagements read-only (409)', async () => {
    const created = (await createEngagementAs(manager.cookie)).json();
    await ctx.prisma.engagement.update({
      where: { id: created.id },
      data: { status: 'ARCHIVED' },
    });

    const patch = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/engagements/${created.id}`,
      headers: { cookie: manager.cookie },
      payload: { name: 'Renamed' },
    });
    expect(patch.statusCode).toBe(409);
    expect(patch.json().error.code).toBe('ENGAGEMENT_ARCHIVED');

    const addMember = await ctx.app.inject({
      method: 'POST',
      url: `/api/engagements/${created.id}/members`,
      headers: { cookie: manager.cookie },
      payload: { userId: staff.user.id },
    });
    expect(addMember.statusCode).toBe(409);
  });

  it('archivedGuard helper throws only for ARCHIVED', () => {
    expect(() => archivedGuard({ status: 'PLANNING' })).not.toThrow();
    expect(() => archivedGuard({ status: 'ARCHIVED' })).toThrowError(AppError);
  });
});
