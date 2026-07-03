import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FSLI_GROUPS, type AccountMappingRow, type FsliGroupRecord } from '@scrutiny/shared';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';

describe('mapping routes', () => {
  let ctx: TestApp;
  let manager: TestUser;
  let engagementId: string;
  let cashAccountId: string;
  let revenueAccountId: string;
  let fsliByCode: Record<string, string>;

  beforeAll(async () => {
    ctx = await createTestApp();
    manager = await createUserWithLogin(ctx, 'MANAGER');

    // Test template DBs are schema-only — seed the FSLI taxonomy here.
    await ctx.prisma.fsliGroup.createMany({
      data: FSLI_GROUPS.map((g, i) => ({
        code: g.code,
        name: g.name,
        statement: g.statement,
        normalSign: g.normalSign,
        sortOrder: i,
      })),
    });
    const groups = await ctx.prisma.fsliGroup.findMany();
    fsliByCode = Object.fromEntries(groups.map((g) => [g.code, g.id]));

    const client = await ctx.prisma.client.create({ data: { name: 'Mapping Client' } });
    const engagement = await ctx.prisma.engagement.create({
      data: {
        clientId: client.id,
        name: 'FY26',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-12-31'),
        members: { create: { userId: manager.user.id } },
      },
    });
    engagementId = engagement.id;

    const cash = await ctx.prisma.account.create({
      data: { engagementId, code: '1000', name: 'Cash on hand' },
    });
    const revenue = await ctx.prisma.account.create({
      data: { engagementId, code: '4000', name: 'Revenue' },
    });
    cashAccountId = cash.id;
    revenueAccountId = revenue.id;

    const tbImport = await ctx.prisma.trialBalanceImport.create({
      data: {
        engagementId,
        kind: 'CURRENT',
        fileName: 'tb.csv',
        importedById: manager.user.id,
        rowCount: 2,
      },
    });
    await ctx.prisma.trialBalanceLine.createMany({
      data: [
        { importId: tbImport.id, accountId: cash.id, amount: 150000n },
        { importId: tbImport.id, accountId: revenue.id, amount: -150000n },
      ],
    });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('lists the seeded FSLI groups in taxonomy order', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/fsli-groups',
      headers: { cookie: manager.cookie },
    });
    expect(res.statusCode).toBe(200);
    const { items } = res.json() as { items: FsliGroupRecord[] };
    expect(items).toHaveLength(24);
    expect(items[0].code).toBe('A.1');
    expect(items[23].code).toBe('X.5');
  });

  it('lists accounts with amounts, mappings, and suggestions', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${engagementId}/mappings`,
      headers: { cookie: manager.cookie },
    });
    expect(res.statusCode).toBe(200);
    const { items } = res.json() as { items: AccountMappingRow[] };
    expect(items).toHaveLength(2);
    const cash = items.find((i) => i.accountCode === '1000');
    expect(cash).toMatchObject({
      accountName: 'Cash on hand',
      currentAmount: 150000,
      fsliGroupId: null,
      suggestedFsliCode: 'A.1',
    });
    const revenue = items.find((i) => i.accountCode === '4000');
    expect(revenue).toMatchObject({ currentAmount: -150000, suggestedFsliCode: 'R.1' });
  });

  it('bulk-saves mappings and reflects them on the next read', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/engagements/${engagementId}/mappings`,
      headers: { cookie: manager.cookie },
      payload: [
        { accountId: cashAccountId, fsliGroupId: fsliByCode['A.1'] },
        { accountId: revenueAccountId, fsliGroupId: fsliByCode['R.1'] },
      ],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ saved: 2 });

    const read = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${engagementId}/mappings`,
      headers: { cookie: manager.cookie },
    });
    const { items } = read.json() as { items: AccountMappingRow[] };
    expect(items.every((i) => i.fsliGroupId !== null)).toBe(true);
  });

  it('re-saving updates the mapping instead of duplicating', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/engagements/${engagementId}/mappings`,
      headers: { cookie: manager.cookie },
      payload: [{ accountId: cashAccountId, fsliGroupId: fsliByCode['A.2'] }],
    });
    expect(res.statusCode).toBe(200);
    expect(await ctx.prisma.accountMapping.count({ where: { engagementId } })).toBe(2);
    const mapping = await ctx.prisma.accountMapping.findUnique({
      where: { accountId: cashAccountId },
    });
    expect(mapping?.fsliGroupId).toBe(fsliByCode['A.2']);
  });

  it('rejects an unknown fsliGroupId with 400', async () => {
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/engagements/${engagementId}/mappings`,
      headers: { cookie: manager.cookie },
      payload: [{ accountId: cashAccountId, fsliGroupId: 'nonexistent' }],
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects accounts that belong to someone else's engagement", async () => {
    const otherClient = await ctx.prisma.client.create({ data: { name: 'Other' } });
    const otherEng = await ctx.prisma.engagement.create({
      data: {
        clientId: otherClient.id,
        name: 'Other FY',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-12-31'),
        members: { create: { userId: manager.user.id } },
      },
    });
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/engagements/${otherEng.id}/mappings`,
      headers: { cookie: manager.cookie },
      payload: [{ accountId: cashAccountId, fsliGroupId: fsliByCode['A.1'] }],
    });
    expect(res.statusCode).toBe(400);
  });

  it('blocks saves on an archived engagement with 409', async () => {
    await ctx.prisma.engagement.update({
      where: { id: engagementId },
      data: { status: 'ARCHIVED' },
    });
    const res = await ctx.app.inject({
      method: 'PUT',
      url: `/api/engagements/${engagementId}/mappings`,
      headers: { cookie: manager.cookie },
      payload: [{ accountId: cashAccountId, fsliGroupId: fsliByCode['A.1'] }],
    });
    expect(res.statusCode).toBe(409);
    await ctx.prisma.engagement.update({
      where: { id: engagementId },
      data: { status: 'PLANNING' },
    });
  });
});
