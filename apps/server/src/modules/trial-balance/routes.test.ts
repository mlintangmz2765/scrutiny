import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TbColumnMap } from '@scrutiny/shared';
import { createTestApp, createUserWithLogin, type TestApp, type TestUser } from '../../test/helpers.js';

const FIXTURES = path.resolve(process.cwd(), '..', '..', 'fixtures');

const debitCreditMap: TbColumnMap = {
  accountCode: 'Code',
  accountName: 'Name',
  debit: 'Debit',
  credit: 'Credit',
  decimalSeparator: '.',
};

/** Builds a multipart/form-data body by hand so tests need no extra dependency. */
function multipartBody(
  fileName: string,
  fileContent: Buffer,
  fields: Record<string, string>,
): { payload: Buffer; headers: Record<string, string> } {
  const boundary = '----scrutiny-test-boundary';
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`,
    ),
    fileContent,
    Buffer.from('\r\n'),
  );
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    payload: Buffer.concat(parts),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

describe('trial balance routes', () => {
  let ctx: TestApp;
  let manager: TestUser;
  let engagementId: string;

  async function upload(
    url: string,
    fixture: string,
    fields: Record<string, string>,
    cookie = manager.cookie,
  ) {
    const { payload, headers } = multipartBody(
      fixture,
      readFileSync(path.join(FIXTURES, fixture)),
      fields,
    );
    return ctx.app.inject({ method: 'POST', url, payload, headers: { ...headers, cookie } });
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    manager = await createUserWithLogin(ctx, 'MANAGER');
    const client = await ctx.prisma.client.create({ data: { name: 'TB Test Client' } });
    const engagement = await ctx.prisma.engagement.create({
      data: {
        clientId: client.id,
        name: 'FY26 audit',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-12-31'),
        members: { create: { userId: manager.user.id } },
      },
    });
    engagementId = engagement.id;
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  it('previews a file with errors without persisting anything', async () => {
    const res = await upload(
      `/api/engagements/${engagementId}/trial-balance/preview`,
      'tb-bad-amounts.csv',
      { columnMap: JSON.stringify(debitCreditMap), kind: 'CURRENT' },
    );
    expect(res.statusCode).toBe(200);
    const body = res.json() as { errors: unknown[]; isBalanced: boolean };
    expect(body.errors.length).toBeGreaterThan(0);
    expect(await ctx.prisma.trialBalanceImport.count()).toBe(0);
    expect(await ctx.prisma.account.count()).toBe(0);
  });

  it('rejects an unbalanced import with TB_INVALID and persists nothing', async () => {
    const res = await upload(
      `/api/engagements/${engagementId}/trial-balance/import`,
      'tb-unbalanced.csv',
      { columnMap: JSON.stringify(debitCreditMap), kind: 'CURRENT' },
    );
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'TB_INVALID' } });
    expect(await ctx.prisma.trialBalanceImport.count()).toBe(0);
  });

  it('imports a valid file with the exact line count', async () => {
    const res = await upload(
      `/api/engagements/${engagementId}/trial-balance/import`,
      'tb-valid.csv',
      { columnMap: JSON.stringify(debitCreditMap), kind: 'CURRENT' },
    );
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ kind: 'CURRENT', rowCount: 31, replaced: false });
    expect(await ctx.prisma.trialBalanceLine.count()).toBe(31);
    expect(await ctx.prisma.account.count({ where: { engagementId } })).toBe(31);
  });

  it('re-import replaces the previous import without duplicating accounts', async () => {
    const res = await upload(
      `/api/engagements/${engagementId}/trial-balance/import`,
      'tb-valid.csv',
      { columnMap: JSON.stringify(debitCreditMap), kind: 'CURRENT' },
    );
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ replaced: true });
    expect(await ctx.prisma.trialBalanceImport.count({ where: { engagementId } })).toBe(1);
    expect(await ctx.prisma.trialBalanceLine.count()).toBe(31);
    expect(await ctx.prisma.account.count({ where: { engagementId } })).toBe(31);
  });

  it('imports PRIOR through the same pipeline alongside CURRENT', async () => {
    const res = await upload(
      `/api/engagements/${engagementId}/trial-balance/import`,
      'tb-valid.csv',
      { columnMap: JSON.stringify(debitCreditMap), kind: 'PRIOR' },
    );
    expect(res.statusCode).toBe(201);
    expect(await ctx.prisma.trialBalanceImport.count({ where: { engagementId } })).toBe(2);
    // PRIOR reuses the same chart of accounts — still 31.
    expect(await ctx.prisma.account.count({ where: { engagementId } })).toBe(31);
  });

  it('reports overview with totals and unmapped account count', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${engagementId}/trial-balance`,
      headers: { cookie: manager.cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      current: { rowCount: number; totalDebit: number; totalCredit: number } | null;
      prior: { rowCount: number } | null;
      unmappedAccountCount: number;
    };
    expect(body.current).toMatchObject({
      rowCount: 31,
      totalDebit: 468_700_000,
      totalCredit: 468_700_000,
    });
    expect(body.prior).toMatchObject({ rowCount: 31 });
    expect(body.unmappedAccountCount).toBe(31);
  });

  it('blocks imports on an archived engagement with 409', async () => {
    await ctx.prisma.engagement.update({
      where: { id: engagementId },
      data: { status: 'ARCHIVED' },
    });
    const res = await upload(
      `/api/engagements/${engagementId}/trial-balance/import`,
      'tb-valid.csv',
      { columnMap: JSON.stringify(debitCreditMap), kind: 'CURRENT' },
    );
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'ENGAGEMENT_ARCHIVED' } });
    await ctx.prisma.engagement.update({
      where: { id: engagementId },
      data: { status: 'PLANNING' },
    });
  });

  it('hides the engagement from non-members with 404', async () => {
    const outsider = await createUserWithLogin(ctx, 'STAFF');
    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/engagements/${engagementId}/trial-balance`,
      headers: { cookie: outsider.cookie },
    });
    expect(res.statusCode).toBe(404);
  });
});
