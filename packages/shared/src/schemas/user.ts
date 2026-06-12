import { z } from 'zod';

/** Global user roles (ARCHITECTURE.md §5). Stored as String in SQLite. */
export const userRoleSchema = z.enum(['ADMIN', 'PARTNER', 'MANAGER', 'STAFF']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(10),
  role: userRoleSchema,
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

/** Password change is an ADMIN reset only (T-01.1). */
export const userUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(10).optional(),
  })
  .strict();
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

/** What the API exposes about a user — never the password hash. */
export const userPublicSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type UserPublic = z.infer<typeof userPublicSchema>;
