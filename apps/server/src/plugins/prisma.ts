import { PrismaClient } from '@prisma/client';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export interface PrismaPluginOptions {
  databaseUrl?: string;
}

export const prismaPlugin = fp<PrismaPluginOptions>(
  async (app, opts) => {
    const prisma = opts.databaseUrl
      ? new PrismaClient({ datasourceUrl: opts.databaseUrl })
      : new PrismaClient();

    app.decorate('prisma', prisma);
    app.addHook('onClose', async () => {
      await prisma.$disconnect();
    });
  },
  { name: 'prisma' },
);
