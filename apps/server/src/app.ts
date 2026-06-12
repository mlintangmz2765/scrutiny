import Fastify, { type FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth/routes.js';
import { clientRoutes } from './modules/clients/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { authPlugin } from './plugins/auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { prismaPlugin } from './plugins/prisma.js';

export interface BuildAppOptions {
  logger?: boolean;
  /** Overrides DATABASE_URL — used by tests to point at a throwaway SQLite file. */
  databaseUrl?: string;
}

export function buildApp(opts: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  app.register(prismaPlugin, { databaseUrl: opts.databaseUrl });
  app.register(errorHandlerPlugin);
  app.register(authPlugin);

  app.register(healthRoutes, { prefix: '/api' });
  app.register(authRoutes, { prefix: '/api' });
  app.register(userRoutes, { prefix: '/api' });
  app.register(clientRoutes, { prefix: '/api' });

  return app;
}
