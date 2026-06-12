import type { FastifyPluginAsync } from 'fastify';
import { clientCreateSchema, clientListQuerySchema, clientUpdateSchema } from '@scrutiny/shared';
import {
  createClient,
  deactivateClient,
  getClient,
  listClients,
  updateClient,
} from './service.js';

export const clientRoutes: FastifyPluginAsync = async (app) => {
  app.get('/clients', async (req) => {
    return listClients(app.prisma, clientListQuerySchema.parse(req.query));
  });

  app.get('/clients/:id', async (req) => {
    const { id } = req.params as { id: string };
    return getClient(app.prisma, id);
  });

  app.post('/clients', async (req, reply) => {
    const created = await createClient(app.prisma, req.user, clientCreateSchema.parse(req.body));
    return reply.code(201).send(created);
  });

  app.patch('/clients/:id', async (req) => {
    const { id } = req.params as { id: string };
    return updateClient(app.prisma, req.user, id, clientUpdateSchema.parse(req.body));
  });

  app.delete('/clients/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await deactivateClient(app.prisma, req.user, id);
    return reply.code(204).send();
  });
};
