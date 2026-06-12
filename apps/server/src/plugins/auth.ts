import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import type { UserRole } from '@scrutiny/shared';
import { AppError } from '../lib/app-error.js';

export interface AuthTokenPayload {
  id: string;
  role: UserRole;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

export const AUTH_COOKIE = 'scrutiny_token';

/** Only these paths skip authentication (ARCHITECTURE.md §5). */
const PUBLIC_PATHS = new Set(['/api/health', '/api/auth/login']);

export const authPlugin = fp(
  async (app) => {
    const secret =
      process.env.JWT_SECRET ??
      (process.env.NODE_ENV === 'production'
        ? undefined
        : 'scrutiny-dev-secret-do-not-use-in-production');
    if (!secret) {
      throw new Error('JWT_SECRET must be set when NODE_ENV=production.');
    }

    await app.register(fastifyCookie);
    await app.register(fastifyJwt, {
      secret,
      cookie: { cookieName: AUTH_COOKIE, signed: false },
      sign: { expiresIn: '12h' },
    });

    // Global deny-by-default: every route (current and future) requires a valid
    // token unless explicitly allowlisted above.
    app.addHook('onRequest', async (req) => {
      const path = req.url.split('?')[0] ?? '';
      if (PUBLIC_PATHS.has(path)) return;
      try {
        await req.jwtVerify();
      } catch {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }
    });
  },
  { name: 'auth', dependencies: ['error-handler'] },
);
