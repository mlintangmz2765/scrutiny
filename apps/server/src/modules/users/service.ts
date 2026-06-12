import type { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  userCreateSchema,
  userUpdateSchema,
  type UserCreateInput,
  type UserPublic,
  type UserRole,
  type UserUpdateInput,
} from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';

// Production cost is 12 (T-01.1). Tests lower it via env to keep suites fast;
// never set BCRYPT_COST in a deployment.
const BCRYPT_COST = Number(process.env.BCRYPT_COST ?? 12);

export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function createUser(prisma: PrismaClient, input: UserCreateInput): Promise<UserPublic> {
  const data = userCreateSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError('EMAIL_TAKEN', 409, 'A user with this email already exists.');

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
  const user = await prisma.user.create({
    data: { email: data.email, name: data.name, role: data.role, passwordHash },
  });
  return toPublicUser(user);
}

/** Returns the user only when the password matches and the account is active. */
export async function verifyPassword(
  prisma: PrismaClient,
  email: string,
  password: string,
): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function listUsers(
  prisma: PrismaClient,
  opts: { page: number; pageSize: number },
): Promise<{ items: UserPublic[]; total: number }> {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      skip: (opts.page - 1) * opts.pageSize,
      take: opts.pageSize,
    }),
    prisma.user.count(),
  ]);
  return { items: items.map(toPublicUser), total };
}

export async function getUser(prisma: PrismaClient, id: string): Promise<UserPublic> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('NOT_FOUND', 404, 'User not found.');
  return toPublicUser(user);
}

export async function updateUser(
  prisma: PrismaClient,
  id: string,
  input: UserUpdateInput,
): Promise<UserPublic> {
  const data = userUpdateSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('NOT_FOUND', 404, 'User not found.');

  const { password, ...rest } = data;
  const passwordHash = password ? await bcrypt.hash(password, BCRYPT_COST) : undefined;
  const updated = await prisma.user.update({
    where: { id },
    data: { ...rest, ...(passwordHash ? { passwordHash } : {}) },
  });
  return toPublicUser(updated);
}

/** Users are never hard-deleted (T-01.1) — deactivation blocks login. */
export async function deactivateUser(prisma: PrismaClient, id: string): Promise<UserPublic> {
  return updateUser(prisma, id, { isActive: false });
}
