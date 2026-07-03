import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FSLI_GROUPS, type TbColumnMap } from '@scrutiny/shared';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';
import { getTbReport, getTbSummary } from './report-service.js';
import { importTrialBalance } from './service.js';

const FIXTURES = path.resolve(process.cwd(), '..', '..', 'fixtures');

const columnMap: TbColumnMap = {
  accountCode: 'Code',
  accountName: 'Name',
  debit: 'Debit',
  credit: 'Credit',
  decimalSeparator: '.',
};

/** Canonical mapping of the tb-valid.csv fixture onto the FSLI taxonomy. */
const MAPPING: Record<string, string> = {
  '1000': 'A.1', '1010': 'A.1', '1020': 'A.1',
  '1200': 'A.2', '1300': 'A.3', '1400': 'A.4', '1500': 'A.5',
  '1600': 'A.6', '1650': 'A.6', '1700': 'A.7', '1800': 'A.8',
  '2000': 'L.1', '2100': 'L.2', '2200': 'L.3', '2300': 'L.4', '2400': 'L.5', '2500': 'L.6',
  '3000': 'E.1', '3100': 'E.2', '3200': 'E.3',
  '4000': 'R.1', '4100': 'R.2',
  '5000': 'X.1',
  '6000': 'X.2', '6100': 'X.2', '6200': 'X.2', '6300': 'X.2', '6400': 'X.2',
  '7000': 'X.3', '7500': 'X.4', '8000': 'X.5',
};

describe('trial balance report service (exact values from tb-valid.csv)', () => {
  let ctx: TestApp;
  let manager: TestUser;
  let engagementId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    manager = await createUserWithLogin(ctx, 'MANAGER');
    await ctx.prisma.fsliGroup.createMany({
      data: FSLI_GROUPS.map((g, i) => ({
        code: g.code, name: g.name, statement: g.statement, normalSign: g.normalSign, sortOrder: i,
      })),
    });

    const client = await ctx.prisma.client.create({ data: { name: 'Report Client' } });
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

    const file = { buffer: readFileSync(path.join(FIXTURES, 'tb-valid.csv')), fileName: 'tb-valid.csv' };
    await importTrialBalance(ctx.prisma, manager.user, engagementId, file, columnMap, 'CURRENT');
    await importTrialBalance(ctx.prisma, manager.user, engagementId, file, columnMap, 'PRIOR');
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function applyCanonicalMapping() {
    const groups = await ctx.prisma.fsliGroup.findMany();
    const groupIdByCode = Object.fromEntries(groups.map((g) => [g.code, g.id]));
    const accounts = await ctx.prisma.account.findMany({ where: { engagementId } });
    for (const account of accounts) {
      const code = MAPPING[account.code];
      if (!code) throw new Error(`No canonical mapping for account ${account.code}`);
      await ctx.prisma.accountMapping.upsert({
        where: { accountId: account.id },
        update: { fsliGroupId: groupIdByCode[code] },
        create: { engagementId, accountId: account.id, fsliGroupId: groupIdByCode[code] },
      });
    }
  }

  it('summary counts every account as unmapped before mapping', async () => {
    const summary = await getTbSummary(ctx.prisma, manager.user, engagementId);
    expect(summary.rows).toEqual([]);
    expect(summary.unmappedAccountCount).toBe(31);
    // The full TB balances, so even the unmapped bucket sums to zero.
    expect(summary.unmappedCurrentTotal).toBe(0);
  });

  it('report returns all rows with exact amounts and zero net totals', async () => {
    await applyCanonicalMapping();
    const report = await getTbReport(ctx.prisma, manager.user, engagementId);
    expect(report.rows).toHaveLength(31);
    expect(report.totals).toEqual({ prior: 0, current: 0 });

    const byCode = Object.fromEntries(report.rows.map((r) => [r.accountCode, r]));
    expect(byCode['1000']).toMatchObject({
      accountName: 'Cash on hand',
      fsliCode: 'A.1',
      priorAmount: 1_500_000,
      currentAmount: 1_500_000,
    });
    expect(byCode['4000']).toMatchObject({ fsliCode: 'R.1', currentAmount: -240_000_000 });
    expect(byCode['1650']).toMatchObject({ fsliCode: 'A.6', currentAmount: -30_000_000 });
  });

  it('summary aggregates exact per-FSLI totals (hand-derived from the fixture)', async () => {
    const summary = await getTbSummary(ctx.prisma, manager.user, engagementId);
    expect(summary.unmappedAccountCount).toBe(0);
    expect(summary.unmappedCurrentTotal).toBe(0);

    const byCode = Object.fromEntries(summary.rows.map((r) => [r.fsliCode, r]));
    // Hand-derived minor-unit totals: see fixture amounts × 100.
    expect(byCode['A.1']).toMatchObject({ currentTotal: 26_700_000, statement: 'BS' }); // 15,000+250,000+2,000
    expect(byCode['A.6']).toMatchObject({ currentTotal: 90_000_000 }); // 1,200,000 − 300,000
    expect(byCode['E.2']).toMatchObject({ currentTotal: -58_700_000 });
    expect(byCode['R.1']).toMatchObject({ currentTotal: -240_000_000, statement: 'IS' });
    expect(byCode['X.2']).toMatchObject({ currentTotal: 55_300_000 }); // 380+90+30+25+28 (thousands)
    expect(byCode['X.5']).toMatchObject({ currentTotal: 6_500_000 });

    // Prior equals current here, so delta is 0 with 0%.
    expect(byCode['A.1']).toMatchObject({ priorTotal: 26_700_000, delta: 0, deltaPct: 0 });

    // Whole-TB sanity: mapped groups sum to zero.
    const net = summary.rows.reduce((acc, r) => acc + r.currentTotal, 0);
    expect(net).toBe(0);
  });

  it('deltaPct is null when there is no prior balance', async () => {
    await ctx.prisma.trialBalanceImport.delete({
      where: { engagementId_kind: { engagementId, kind: 'PRIOR' } },
    });
    const summary = await getTbSummary(ctx.prisma, manager.user, engagementId);
    const revenue = summary.rows.find((r) => r.fsliCode === 'R.1');
    expect(revenue).toMatchObject({ priorTotal: 0, delta: -240_000_000, deltaPct: null });
  });
});
