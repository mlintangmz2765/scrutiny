import type { UserRole } from '@scrutiny/shared';
import { AppError } from './app-error.js';
import type { AuthTokenPayload } from '../plugins/auth.js';

export const MANAGER_AND_UP: UserRole[] = ['MANAGER', 'PARTNER', 'ADMIN'];

/** Throws 403 unless the acting user has one of the given roles. */
export function requireRole(user: AuthTokenPayload, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new AppError('FORBIDDEN', 403, 'Your role does not permit this action.');
  }
}
