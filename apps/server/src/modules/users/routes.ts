import type { FastifyPluginAsync } from 'fastify';
import {
  paginationQuerySchema,
  userCreateSchema,
  userUpdateSchema,
} from '@scrutiny/shared';
import { MANAGER_AND_UP, requireRole } from '../../lib/authz.js';
import { createUser, listUsers, updateUser } from './service.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Readable by MANAGER+ so engagement member pickers can list users
  // (docs/DECISIONS.md); mutations stay ADMIN-only.
  app.get('/users', async (req) => {
    requireRole(req.user, MANAGER_AND_UP);
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    return listUsers(app.prisma, { page, pageSize });
  });

  app.post('/users', async (req, reply) => {
    requireRole(req.user, ['ADMIN']);
    const created = await createUser(app.prisma, userCreateSchema.parse(req.body));
    return reply.code(201).send(created);
  });

  app.patch('/users/:id', async (req) => {
    requireRole(req.user, ['ADMIN']);
    const { id } = req.params as { id: string };
    return updateUser(app.prisma, id, userUpdateSchema.parse(req.body));
  });
};
