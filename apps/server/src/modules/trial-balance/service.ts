import type { PrismaClient } from '@prisma/client';
import { bigIntToAmount, type TbColumnMap, type TbImportKind } from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { archivedGuard, requireEngagementAccess } from '../../lib/engagement-access.js';
import type { AuthTokenPayload } from '../../plugins/auth.js';
import { recordAudit } from '../audit-log/service.js';
import { parseTrialBalanceFile, type ParseResult, type ParsedRow } from './parser.js';

const PREVIEW_ROW_LIMIT = 50;

export interface TbPreview {
  rows: ParsedRow[];
  rowCount: number;
  errors: ParseResult['errors'];
  totalDebit: number;
  totalCredit: number;
  total: number;
  isBalanced: boolean;
}

export interface TbImportSummary {
  importId: string;
  kind: TbImportKind;
  fileName: string;
  rowCount: number;
  replaced: boolean;
}

export interface TbImportMeta {
  kind: TbImportKind;
  fileName: string;
  importedAt: string;
  importedByName: string;
  rowCount: number;
  totalDebit: number;
  totalCredit: number;
}

export interface TbOverview {
  current: TbImportMeta | null;
  prior: TbImportMeta | null;
  unmappedAccountCount: number;
}

export async function previewTrialBalance(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
  file: { buffer: Buffer; fileName: string },
  columnMap: TbColumnMap,
): Promise<TbPreview> {
  const engagement = await requireEngagementAccess(prisma, user, engagementId);
  const parsed = await parseTrialBalanceFile(
    file.buffer,
    file.fileName,
    columnMap,
    engagement.minorUnitsPerMajor,
  );
  return {
    rows: parsed.rows.slice(0, PREVIEW_ROW_LIMIT),
    rowCount: parsed.rows.length,
    errors: parsed.errors,
    totalDebit: parsed.totalDebit,
    totalCredit: parsed.totalCredit,
    total: parsed.total,
    isBalanced: parsed.isBalanced,
  };
}

/**
 * Replaces the (engagement, kind) import transactionally: accounts are upserted
 * by code (names refreshed), lines of the previous import are deleted with it,
 * and new lines inserted. Rejected outright when any row errors or unbalanced.
 */
export async function importTrialBalance(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
  file: { buffer: Buffer; fileName: string },
  columnMap: TbColumnMap,
  kind: TbImportKind,
): Promise<TbImportSummary> {
  const engagement = await requireEngagementAccess(prisma, user, engagementId);
  archivedGuard(engagement);

  const parsed = await parseTrialBalanceFile(
    file.buffer,
    file.fileName,
    columnMap,
    engagement.minorUnitsPerMajor,
  );
  if (parsed.errors.length > 0 || !parsed.isBalanced) {
    throw new AppError(
      'TB_INVALID',
      400,
      parsed.errors.length > 0
        ? `The file has ${parsed.errors.length} row error(s); fix them and re-upload.`
        : 'The trial balance does not balance (sum of signed amounts must be 0).',
    );
  }

  const replaced = await prisma.$transaction(async (tx) => {
    const existing = await tx.trialBalanceImport.findUnique({
      where: { engagementId_kind: { engagementId, kind } },
    });
    if (existing) {
      // Lines cascade-delete with their import (schema onDelete: Cascade).
      await tx.trialBalanceImport.delete({ where: { id: existing.id } });
    }

    const accountIdByCode = new Map<string, string>();
    for (const row of parsed.rows) {
      const account = await tx.account.upsert({
        where: { engagementId_code: { engagementId, code: row.accountCode } },
        update: { name: row.accountName },
        create: { engagementId, code: row.accountCode, name: row.accountName },
      });
      accountIdByCode.set(row.accountCode, account.id);
    }

    const created = await tx.trialBalanceImport.create({
      data: {
        engagementId,
        kind,
        fileName: file.fileName,
        importedById: user.id,
        rowCount: parsed.rows.length,
      },
    });
    await tx.trialBalanceLine.createMany({
      data: parsed.rows.map((row) => {
        const accountId = accountIdByCode.get(row.accountCode);
        if (accountId === undefined) {
          throw new AppError('INTERNAL', 500, 'Account upsert lost a code.');
        }
        return { importId: created.id, accountId, amount: BigInt(row.amount) };
      }),
    });
    return { importId: created.id, replacedExisting: existing !== null };
  });

  await recordAudit(prisma, {
    userId: user.id,
    action: replaced.replacedExisting ? 'UPDATE' : 'CREATE',
    entityType: 'TrialBalanceImport',
    entityId: replaced.importId,
    engagementId,
  });

  return {
    importId: replaced.importId,
    kind,
    fileName: file.fileName,
    rowCount: parsed.rows.length,
    replaced: replaced.replacedExisting,
  };
}

export async function getTrialBalanceOverview(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
): Promise<TbOverview> {
  await requireEngagementAccess(prisma, user, engagementId);

  const imports = await prisma.trialBalanceImport.findMany({
    where: { engagementId },
    include: { importedBy: { select: { name: true } }, lines: { select: { amount: true } } },
  });

  const toMeta = (kind: TbImportKind): TbImportMeta | null => {
    const imp = imports.find((i) => i.kind === kind);
    if (!imp) return null;
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of imp.lines) {
      const amount = bigIntToAmount(line.amount);
      if (amount >= 0) totalDebit += amount;
      else totalCredit += -amount;
    }
    return {
      kind,
      fileName: imp.fileName,
      importedAt: imp.importedAt.toISOString(),
      importedByName: imp.importedBy.name,
      rowCount: imp.rowCount,
      totalDebit,
      totalCredit,
    };
  };

  const unmappedAccountCount = await prisma.account.count({
    where: { engagementId, mapping: null },
  });

  return { current: toMeta('CURRENT'), prior: toMeta('PRIOR'), unmappedAccountCount };
}
