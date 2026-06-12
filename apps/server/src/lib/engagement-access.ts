import type { Engagement, PrismaClient } from '@prisma/client';
import { AppError } from './app-error.js';
import type { AuthTokenPayload } from '../plugins/auth.js';

/**
 * Visibility rule (ARCHITECTURE.md §5): non-members get 404 — not 403 — so the
 * existence of engagements they don't work on is never leaked. ADMIN sees all.
 * Every engagement-scoped module MUST resolve access through this helper.
 */
export async function requireEngagementAccess(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  engagementId: string,
): Promise<Engagement> {
  const engagement = await prisma.engagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw new AppError('NOT_FOUND', 404, 'Engagement not found.');
  if (user.role === 'ADMIN') return engagement;

  const member = await prisma.engagementMember.findUnique({
    where: { engagementId_userId: { engagementId, userId: user.id } },
  });
  if (!member) throw new AppError('NOT_FOUND', 404, 'Engagement not found.');
  return engagement;
}

/**
 * Archived engagements are read-only (ARCHITECTURE.md §8). Every mutation in
 * every engagement-scoped module MUST call this before writing.
 */
export function archivedGuard(engagement: Pick<Engagement, 'status'>): void {
  if (engagement.status === 'ARCHIVED') {
    throw new AppError('ENGAGEMENT_ARCHIVED', 409, 'This engagement is archived and read-only.');
  }
}
