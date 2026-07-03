import type { PrismaClient } from '@prisma/client';
import {
  bigIntToAmount,
  suggestFsli,
  type AccountMappingRow,
  type FsliGroupRecord,
  type FsliStatement,
  type MappingsUpdateInput,
  type NormalSign,
} from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { archivedGuard, requireEngagementAccess } from '../../lib/engagement-access.js';
import type { AuthTokenPayload } from '../../plugins/auth.js';
import { recordAudit } from '../audit-log/service.js';

export async function listFsliGroups(prisma: PrismaClient): Promise<FsliGroupRecord[]> {
  const groups = await prisma.fsliGroup.findMany({ orderBy: { sortOrder: 'asc' } });
  return groups.map((g) => ({
    id: g.id,
    code: g.code,
    name: g.name,
    statement: g.statement as FsliStatement,
    normalSign: g.normalSign as NormalSign,
    sortOrder: g.sortOrder,
  }));
}

/** Every account of the engagement with its current mapping and a suggestion. */
export async function listMappings(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
): Promise<AccountMappingRow[]> {
  await requireEngagementAccess(prisma, user, engagementId);

  const accounts = await prisma.account.findMany({
    where: { engagementId },
    orderBy: { code: 'asc' },
    include: {
      mapping: { select: { fsliGroupId: true } },
      lines: {
        where: { import: { engagementId, kind: 'CURRENT' } },
        select: { amount: true },
      },
    },
  });

  return accounts.map((a) => ({
    accountId: a.id,
    accountCode: a.code,
    accountName: a.name,
    currentAmount: a.lines[0] !== undefined ? bigIntToAmount(a.lines[0].amount) : null,
    fsliGroupId: a.mapping?.fsliGroupId ?? null,
    suggestedFsliCode: suggestFsli(a.name),
  }));
}

/** Bulk upsert of account→FSLI mappings; validates every id before writing. */
export async function saveMappings(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
  input: MappingsUpdateInput,
): Promise<{ saved: number }> {
  const engagement = await requireEngagementAccess(prisma, user, engagementId);
  archivedGuard(engagement);

  const accountIds = input.map((m) => m.accountId);
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, engagementId },
    select: { id: true },
  });
  if (accounts.length !== new Set(accountIds).size) {
    throw new AppError('VALIDATION', 400, 'One or more accounts do not belong to this engagement.');
  }

  const groupIds = [...new Set(input.map((m) => m.fsliGroupId))];
  const groups = await prisma.fsliGroup.findMany({
    where: { id: { in: groupIds } },
    select: { id: true },
  });
  if (groups.length !== groupIds.length) {
    throw new AppError('VALIDATION', 400, 'One or more FSLI groups do not exist.');
  }

  await prisma.$transaction(
    input.map((m) =>
      prisma.accountMapping.upsert({
        where: { accountId: m.accountId },
        update: { fsliGroupId: m.fsliGroupId },
        create: { engagementId, accountId: m.accountId, fsliGroupId: m.fsliGroupId },
      }),
    ),
  );

  await recordAudit(prisma, {
    userId: user.id,
    action: 'UPDATE',
    entityType: 'AccountMapping',
    entityId: engagementId,
    engagementId,
    changes: { saved: [null, input.length] },
  });

  return { saved: input.length };
}
