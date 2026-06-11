import Fastify, { type FastifyInstance } from 'fastify';
import { healthRoutes } from './modules/health/routes.js';
import { prismaPlugin } from './plugins/prisma.js';

export interface BuildAppOptions {
  logger?: boolean;
  /** Overrides DATABASE_URL — used by tests to point at a throwaway SQLite file. */
  databaseUrl?: string;
}

export function buildApp(opts: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  app.register(prismaPlugin, { databaseUrl: opts.databaseUrl });
  app.register(healthRoutes, { prefix: '/api' });

  return app;
}
