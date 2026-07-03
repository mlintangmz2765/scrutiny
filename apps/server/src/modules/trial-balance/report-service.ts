import type { PrismaClient } from '@prisma/client';
import { bigIntToAmount, type FsliStatement } from '@scrutiny/shared';
import { requireEngagementAccess } from '../../lib/engagement-access.js';
import type { AuthTokenPayload } from '../../plugins/auth.js';

export interface TbReportRow {
  accountCode: string;
  accountName: string;
  fsliCode: string | null;
  /** Signed minor units; null when the account is absent from that import. */
  priorAmount: number | null;
  currentAmount: number | null;
}

export interface TbReport {
  rows: TbReportRow[];
  totals: { prior: number; current: number };
}

export interface TbSummaryRow {
  fsliCode: string;
  name: string;
  statement: FsliStatement;
  priorTotal: number;
  currentTotal: number;
  delta: number;
  /** delta / |priorTotal|, or null when the prior total is zero. */
  deltaPct: number | null;
}

export interface TbSummary {
  rows: TbSummaryRow[];
  unmappedCurrentTotal: number;
  unmappedAccountCount: number;
}

/** Per-account amounts for one import kind, keyed by accountId. */
async function amountsByAccount(
  prisma: PrismaClient,
  engagementId: string,
  kind: 'CURRENT' | 'PRIOR',
): Promise<Map<string, number>> {
  const lines = await prisma.trialBalanceLine.findMany({
    where: { import: { engagementId, kind } },
    select: { accountId: true, amount: true },
  });
  return new Map(lines.map((l) => [l.accountId, bigIntToAmount(l.amount)]));
}

export async function getTbReport(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
): Promise<TbReport> {
  await requireEngagementAccess(prisma, user, engagementId);

  const [accounts, current, prior] = await Promise.all([
    prisma.account.findMany({
      where: { engagementId },
      orderBy: { code: 'asc' },
      include: { mapping: { include: { fsliGroup: { select: { code: true } } } } },
    }),
    amountsByAccount(prisma, engagementId, 'CURRENT'),
    amountsByAccount(prisma, engagementId, 'PRIOR'),
  ]);

  const rows: TbReportRow[] = accounts.map((a) => ({
    accountCode: a.code,
    accountName: a.name,
    fsliCode: a.mapping?.fsliGroup.code ?? null,
    priorAmount: prior.get(a.id) ?? null,
    currentAmount: current.get(a.id) ?? null,
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      prior: acc.prior + (r.priorAmount ?? 0),
      current: acc.current + (r.currentAmount ?? 0),
    }),
    { prior: 0, current: 0 },
  );

  return { rows, totals };
}

export async function getTbSummary(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
): Promise<TbSummary> {
  await requireEngagementAccess(prisma, user, engagementId);

  const [groups, accounts, current, prior] = await Promise.all([
    prisma.fsliGroup.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.account.findMany({
      where: { engagementId },
      select: { id: true, mapping: { select: { fsliGroupId: true } } },
    }),
    amountsByAccount(prisma, engagementId, 'CURRENT'),
    amountsByAccount(prisma, engagementId, 'PRIOR'),
  ]);

  const byGroup = new Map<string, { priorTotal: number; currentTotal: number }>();
  let unmappedCurrentTotal = 0;
  let unmappedAccountCount = 0;

  for (const account of accounts) {
    const groupId = account.mapping?.fsliGroupId ?? null;
    if (groupId === null) {
      unmappedAccountCount += 1;
      unmappedCurrentTotal += current.get(account.id) ?? 0;
      continue;
    }
    const bucket = byGroup.get(groupId) ?? { priorTotal: 0, currentTotal: 0 };
    bucket.priorTotal += prior.get(account.id) ?? 0;
    bucket.currentTotal += current.get(account.id) ?? 0;
    byGroup.set(groupId, bucket);
  }

  const rows: TbSummaryRow[] = groups
    .filter((g) => byGroup.has(g.id))
    .map((g) => {
      const bucket = byGroup.get(g.id) ?? { priorTotal: 0, currentTotal: 0 };
      const delta = bucket.currentTotal - bucket.priorTotal;
      return {
        fsliCode: g.code,
        name: g.name,
        statement: g.statement as FsliStatement,
        priorTotal: bucket.priorTotal,
        currentTotal: bucket.currentTotal,
        delta,
        deltaPct: bucket.priorTotal !== 0 ? delta / Math.abs(bucket.priorTotal) : null,
      };
    });

  return { rows, unmappedCurrentTotal, unmappedAccountCount };
}
