import type { FastifyPluginAsync } from 'fastify';
import {
  engagementCreateSchema,
  engagementListQuerySchema,
  engagementUpdateSchema,
  memberAddSchema,
  statusTransitionSchema,
} from '@scrutiny/shared';
import {
  addMember,
  createEngagement,
  getEngagement,
  listEngagements,
  listMembers,
  removeMember,
  transitionStatus,
  updateEngagement,
} from './service.js';

export const engagementRoutes: FastifyPluginAsync = async (app) => {
  app.get('/engagements', async (req) => {
    return listEngagements(app.prisma, req.user, engagementListQuerySchema.parse(req.query));
  });

  app.post('/engagements', async (req, reply) => {
    const created = await createEngagement(
      app.prisma,
      req.user,
      engagementCreateSchema.parse(req.body),
    );
    return reply.code(201).send(created);
  });

  app.get('/engagements/:id', async (req) => {
    const { id } = req.params as { id: string };
    return getEngagement(app.prisma, req.user, id);
  });

  app.patch('/engagements/:id', async (req) => {
    const { id } = req.params as { id: string };
    return updateEngagement(app.prisma, req.user, id, engagementUpdateSchema.parse(req.body));
  });

  app.post('/engagements/:id/status', async (req) => {
    const { id } = req.params as { id: string };
    const { target } = statusTransitionSchema.parse(req.body);
    return transitionStatus(app.prisma, req.user, id, target);
  });

  app.get('/engagements/:id/members', async (req) => {
    const { id } = req.params as { id: string };
    return { items: await listMembers(app.prisma, req.user, id) };
  });

  app.post('/engagements/:id/members', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { userId } = memberAddSchema.parse(req.body);
    const items = await addMember(app.prisma, req.user, id, userId);
    return reply.code(201).send({ items });
  });

  app.delete('/engagements/:id/members/:userId', async (req, reply) => {
    const { id, userId } = req.params as { id: string; userId: string };
    await removeMember(app.prisma, req.user, id, userId);
    return reply.code(204).send();
  });
};
