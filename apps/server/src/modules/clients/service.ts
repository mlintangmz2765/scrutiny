import type { Client, PrismaClient } from '@prisma/client';
import type { ClientCreateInput, ClientListQuery, ClientUpdateInput } from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { MANAGER_AND_UP, requireRole } from '../../lib/authz.js';
import type { AuthTokenPayload } from '../../plugins/auth.js';
import { computeChanges, recordAudit } from '../audit-log/service.js';

const AUDITED_CLIENT_FIELDS = [
  'name',
  'registrationNumber',
  'industry',
  'contactName',
  'contactEmail',
  'notes',
  'isActive',
];

export async function listClients(
  prisma: PrismaClient,
  query: ClientListQuery,
): Promise<{ items: Client[]; total: number }> {
  // SQLite LIKE is case-insensitive for ASCII, which `contains` compiles to.
  const where = query.search ? { name: { contains: query.search } } : {};
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.client.count({ where }),
  ]);
  return { items, total };
}

export async function getClient(prisma: PrismaClient, id: string): Promise<Client> {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new AppError('NOT_FOUND', 404, 'Client not found.');
  return client;
}

export async function createClient(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  input: ClientCreateInput,
): Promise<Client> {
  requireRole(user, MANAGER_AND_UP);
  const created = await prisma.client.create({ data: input });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'CREATE',
    entityType: 'Client',
    entityId: created.id,
  });
  return created;
}

export async function updateClient(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  id: string,
  input: ClientUpdateInput,
): Promise<Client> {
  requireRole(user, MANAGER_AND_UP);
  if (input.isActive !== undefined) {
    // Activation state is an ADMIN concern (T-01.4).
    requireRole(user, ['ADMIN']);
  }
  const before = await getClient(prisma, id);
  const updated = await prisma.client.update({ where: { id }, data: input });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'UPDATE',
    entityType: 'Client',
    entityId: id,
    changes: computeChanges(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      AUDITED_CLIENT_FIELDS,
    ),
  });
  return updated;
}

/** Clients are never hard-deleted; ADMIN deactivates them. */
export async function deactivateClient(
  prisma: PrismaClient,
  user: AuthTokenPayload,
  id: string,
): Promise<void> {
  requireRole(user, ['ADMIN']);
  await getClient(prisma, id);
  await prisma.client.update({ where: { id }, data: { isActive: false } });
  await recordAudit(prisma, {
    userId: user.id,
    action: 'DELETE',
    entityType: 'Client',
    entityId: id,
  });
}
