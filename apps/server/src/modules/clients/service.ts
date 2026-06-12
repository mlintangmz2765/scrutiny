import type { Client, PrismaClient } from '@prisma/client';
import type { ClientCreateInput, ClientListQuery, ClientUpdateInput } from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { MANAGER_AND_UP, requireRole } from '../../lib/authz.js';
import type { AuthTokenPayload } from '../../plugins/auth.js';

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
  return prisma.client.create({ data: input });
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
  await getClient(prisma, id);
  return prisma.client.update({ where: { id }, data: input });
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
}
