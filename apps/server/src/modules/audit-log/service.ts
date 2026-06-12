import type { PrismaClient } from '@prisma/client';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS' | 'LOGIN' | 'LOGIN_FAILED';

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  engagementId?: string;
  changes?: Record<string, [unknown, unknown]>;
}

/** Append-only write; every service mutation calls this (ARCHITECTURE.md §8). */
export async function recordAudit(prisma: PrismaClient, entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      engagementId: entry.engagementId ?? null,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
    },
  });
}

/** Field-level diff of an update: only fields that actually changed. */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): Record<string, [unknown, unknown]> {
  const changes: Record<string, [unknown, unknown]> = {};
  for (const field of fields) {
    const oldValue = before[field] ?? null;
    const newValue = after[field] ?? null;
    if (oldValue !== newValue) changes[field] = [oldValue, newValue];
  }
  return changes;
}

export interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  engagementId: string | null;
  changes: Record<string, [unknown, unknown]> | null;
  createdAt: string;
}

export async function listAuditLog(
  prisma: PrismaClient,
  opts: { engagementId?: string; page: number; pageSize: number },
): Promise<{ items: AuditLogRow[]; total: number }> {
  const where = opts.engagementId ? { engagementId: opts.engagementId } : {};
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      engagementId: row.engagementId,
      changes: row.changes ? (JSON.parse(row.changes) as Record<string, [unknown, unknown]>) : null,
      createdAt: row.createdAt.toISOString(),
    })),
    total,
  };
}
