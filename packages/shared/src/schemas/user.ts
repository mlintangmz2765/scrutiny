import { z } from 'zod';

/** Global user roles (ARCHITECTURE.md §5). Stored as String in SQLite. */
export const userRoleSchema = z.enum(['ADMIN', 'PARTNER', 'MANAGER', 'STAFF']);
export type UserRole = z.infer<typeof userRoleSchema>;
