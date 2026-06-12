import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';

describe('client routes', () => {
  let ctx: TestApp;
  let admin: TestUser;
  let manager: TestUser;
  let staff: TestUser;

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await createUserWithLogin(ctx, 'ADMIN');
    manager = await createUserWithLogin(ctx, 'MANAGER');
    staff = await createUserWithLogin(ctx, 'STAFF');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function createClientAs(cookie: string, name: string) {
    return ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { cookie },
      payload: { name },
    });
  }

  it('lets MANAGER create a client', async () => {
    const res = await createClientAs(manager.cookie, 'Aurora Manufacturing Ltd');
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Aurora Manufacturing Ltd');
    expect(res.json().isActive).toBe(true);
  });

  it('denies creation to STAFF (403)', async () => {
    const res = await createClientAs(staff.cookie, 'Should Not Exist');
    expect(res.statusCode).toBe(403);
  });

  it('rejects a missing name (400 VALIDATION_ERROR)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/clients',
      headers: { cookie: manager.cookie },
      payload: { industry: 'Mining' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('reads and updates a client', async () => {
    const created = (await createClientAs(manager.cookie, 'Borneo Retail Group')).json();
    const got = await ctx.app.inject({
      method: 'GET',
      url: `/api/clients/${created.id}`,
      headers: { cookie: staff.cookie },
    });
    expect(got.statusCode).toBe(200);

    const patched = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/clients/${created.id}`,
      headers: { cookie: manager.cookie },
      payload: { industry: 'Retail' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().industry).toBe('Retail');
  });

  it('returns 404 for an unknown client', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/clients/does-not-exist',
      headers: { cookie: staff.cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it('restricts deactivation to ADMIN', async () => {
    const created = (await createClientAs(manager.cookie, 'Cendana Logistics')).json();

    const asManager = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/clients/${created.id}`,
      headers: { cookie: manager.cookie },
    });
    expect(asManager.statusCode).toBe(403);

    const viaPatch = await ctx.app.inject({
      method: 'PATCH',
      url: `/api/clients/${created.id}`,
      headers: { cookie: manager.cookie },
      payload: { isActive: false },
    });
    expect(viaPatch.statusCode).toBe(403);

    const asAdmin = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/clients/${created.id}`,
      headers: { cookie: admin.cookie },
    });
    expect(asAdmin.statusCode).toBe(204);

    const after = await ctx.app.inject({
      method: 'GET',
      url: `/api/clients/${created.id}`,
      headers: { cookie: staff.cookie },
    });
    expect(after.json().isActive).toBe(false);
  });

  it('paginates and searches by name', async () => {
    await createClientAs(manager.cookie, 'Searchable Alpha');
    await createClientAs(manager.cookie, 'Searchable Beta');

    const page = await ctx.app.inject({
      method: 'GET',
      url: '/api/clients?page=1&pageSize=2',
      headers: { cookie: staff.cookie },
    });
    expect(page.statusCode).toBe(200);
    expect(page.json().items).toHaveLength(2);
    expect(page.json().total).toBeGreaterThanOrEqual(4);

    const search = await ctx.app.inject({
      method: 'GET',
      url: '/api/clients?search=searchable',
      headers: { cookie: staff.cookie },
    });
    expect(search.json().total).toBe(2);
  });
});
