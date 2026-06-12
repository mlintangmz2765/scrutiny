import type { FastifyPluginAsync } from 'fastify';
import { loginSchema, type UserRole } from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { AUTH_COOKIE } from '../../plugins/auth.js';
import { recordAudit } from '../audit-log/service.js';
import { toPublicUser, verifyPassword } from '../users/service.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', async (req, reply) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await verifyPassword(app.prisma, email, password);
    if (!user) {
      await recordAudit(app.prisma, {
        userId: null,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: email,
      });
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password.');
    }
    await recordAudit(app.prisma, {
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
    });
    const token = await reply.jwtSign({ id: user.id, role: user.role as UserRole });
    reply.setCookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60,
    });
    return toPublicUser(user);
  });

  app.post('/auth/logout', async (_req, reply) => {
    reply.clearCookie(AUTH_COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/auth/me', async (req) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.isActive) {
      throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
    }
    return toPublicUser(user);
  });
};
