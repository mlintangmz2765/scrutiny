import type { Engagement, PrismaClient } from '@prisma/client';
import {
  ENGAGEMENT_STATUS_ORDER,
  type EngagementCreateInput,
  type EngagementListQuery,
  type EngagementMemberRecord,
  type EngagementRecord,
  type EngagementStatus,
  type EngagementUpdateInput,
} from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { MANAGER_AND_UP, requireRole } from '../../lib/authz.js';
import { archivedGuard, requireEngagementAccess } from '../../lib/engagement-access.js';
import type { AuthTokenPayload } from '../../plugins/auth.js';
import { computeChanges, recordAudit } from '../audit-log/service.js';

type EngagementWithExtras = Engagement & {
  client: { name: string };
  _count: { members: number };
};

const includeExtras = {
  client: { select: { name: true } },
  _count: { select: { members: true } },
} as const;

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function toRecord(e: EngagementWithExtras): EngagementRecord {
  return {
    id: e.id,
    clientId: e.clientId,
    clientName: e.client.name,
    name: e.name,
    periodStart: toDateOnly(e.periodStart),
    periodEnd: toDateOnly(e.periodEnd),
    currencyCode: e.currencyCode,
    minorUnitsPerMajor: e.minorUnitsPerMajor,
    status: e.status as EngagementStatus,
    memberCount: e._count.members,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function createEngagement(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  input: EngagementCreateInput,
): Promise<EngagementRecord> {
  requireRole(user, MANAGER_AND_UP);
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client || !client.isActive) {
    throw new AppError('CLIENT_NOT_FOUND', 400, 'Client does not exist or is inactive.');
  }
  const created = await prisma.engagement.create({
    data: {
      clientId: input.clientId,
      name: input.name,
      periodStart: toUtcDate(input.periodStart),
      periodEnd: toUtcDate(input.periodEnd),
      currencyCode: input.currencyCode,
      minorUnitsPerMajor: input.minorUnitsPerMajor,
      members: { create: { userId: user.id } },
    },
    include: includeExtras,
  });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'CREATE',
    entityType: 'Engagement',
    entityId: created.id,
    engagementId: created.id,
  });
  return toRecord(created);
}

export async function listEngagements(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  query: EngagementListQuery,
): Promise<{ items: EngagementRecord[]; total: number }> {
  const where = {
    ...(user.role === 'ADMIN' ? {} : { members: { some: { userId: user.id } } }),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.engagement.findMany({
      where,
      include: includeExtras,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.engagement.count({ where }),
  ]);
  return { items: items.map(toRecord), total };
}

export async function getEngagement(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  id: string,
): Promise<EngagementRecord> {
  await requireEngagementAccess(prisma, user, id);
  const engagement = await prisma.engagement.findUniqueOrThrow({
    where: { id },
    include: includeExtras,
  });
  return toRecord(engagement);
}

export async function updateEngagement(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  id: string,
  input: EngagementUpdateInput,
): Promise<EngagementRecord> {
  const engagement = await requireEngagementAccess(prisma, user, id);
  requireRole(user, MANAGER_AND_UP);
  archivedGuard(engagement);

  const mergedStart = input.periodStart ?? toDateOnly(engagement.periodStart);
  const mergedEnd = input.periodEnd ?? toDateOnly(engagement.periodEnd);
  if (mergedEnd <= mergedStart) {
    throw new AppError('VALIDATION_ERROR', 400, 'periodEnd must be after periodStart.');
  }

  const updated = await prisma.engagement.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.periodStart !== undefined ? { periodStart: toUtcDate(input.periodStart) } : {}),
      ...(input.periodEnd !== undefined ? { periodEnd: toUtcDate(input.periodEnd) } : {}),
      ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
      ...(input.minorUnitsPerMajor !== undefined
        ? { minorUnitsPerMajor: input.minorUnitsPerMajor }
        : {}),
    },
    include: includeExtras,
  });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Engagement',
    entityId: id,
    engagementId: id,
    changes: computeChanges(
      {
        name: engagement.name,
        periodStart: toDateOnly(engagement.periodStart),
        periodEnd: toDateOnly(engagement.periodEnd),
        currencyCode: engagement.currencyCode,
        minorUnitsPerMajor: engagement.minorUnitsPerMajor,
      },
      {
        name: updated.name,
        periodStart: toDateOnly(updated.periodStart),
        periodEnd: toDateOnly(updated.periodEnd),
        currencyCode: updated.currencyCode,
        minorUnitsPerMajor: updated.minorUnitsPerMajor,
      },
      ['name', 'periodStart', 'periodEnd', 'currencyCode', 'minorUnitsPerMajor'],
    ),
  });
  return toRecord(updated);
}

export async function transitionStatus(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  id: string,
  target: EngagementStatus,
): Promise<EngagementRecord> {
  const engagement = await requireEngagementAccess(prisma, user, id);
  archivedGuard(engagement);

  if (target === 'ARCHIVED') {
    // Archiving runs through the completion checklist flow (Phase 8).
    throw new AppError(
      'ARCHIVE_VIA_COMPLETION',
      400,
      'Archiving is done from the completion checklist, not a direct status change.',
    );
  }

  const currentIdx = ENGAGEMENT_STATUS_ORDER.indexOf(engagement.status as EngagementStatus);
  const targetIdx = ENGAGEMENT_STATUS_ORDER.indexOf(target);

  if (targetIdx === currentIdx + 1) {
    requireRole(user, MANAGER_AND_UP);
  } else if (targetIdx === currentIdx - 1) {
    // Only ADMIN may move a stage backward (DOMAIN.md §1).
    requireRole(user, ['ADMIN']);
  } else {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      400,
      `Cannot move from ${engagement.status} to ${target}; stages change one step at a time.`,
    );
  }

  const updated = await prisma.engagement.update({
    where: { id },
    data: { status: target },
    include: includeExtras,
  });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'STATUS',
    entityType: 'Engagement',
    entityId: id,
    engagementId: id,
    changes: { status: [engagement.status, target] },
  });
  return toRecord(updated);
}

export async function listMembers(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
): Promise<EngagementMemberRecord[]> {
  await requireEngagementAccess(prisma, user, engagementId);
  const members = await prisma.engagementMember.findMany({
    where: { engagementId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.user.role,
  }));
}

export async function addMember(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
  userId: string,
): Promise<EngagementMemberRecord[]> {
  const engagement = await requireEngagementAccess(prisma, user, engagementId);
  requireRole(user, MANAGER_AND_UP);
  archivedGuard(engagement);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !target.isActive) {
    throw new AppError('USER_NOT_FOUND', 400, 'User does not exist or is inactive.');
  }
  const existing = await prisma.engagementMember.findUnique({
    where: { engagementId_userId: { engagementId, userId } },
  });
  if (existing) throw new AppError('ALREADY_MEMBER', 409, 'User is already a member.');

  await prisma.engagementMember.create({ data: { engagementId, userId } });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'CREATE',
    entityType: 'EngagementMember',
    entityId: userId,
    engagementId,
  });
  return listMembers(prisma, user, engagementId);
}

export async function removeMember(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
  userId: string,
): Promise<void> {
  const engagement = await requireEngagementAccess(prisma, user, engagementId);
  requireRole(user, MANAGER_AND_UP);
  archivedGuard(engagement);

  const existing = await prisma.engagementMember.findUnique({
    where: { engagementId_userId: { engagementId, userId } },
  });
  if (!existing) throw new AppError('NOT_FOUND', 404, 'Member not found.');
  await prisma.engagementMember.delete({ where: { id: existing.id } });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'EngagementMember',
    entityId: userId,
    engagementId,
  });
}
