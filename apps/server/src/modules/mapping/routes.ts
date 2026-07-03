import type { FastifyPluginAsync } from 'fastify';
import { mappingsUpdateSchema } from '@scrutiny/shared';
import { listFsliGroups, listMappings, saveMappings } from './service.js';

export const mappingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/fsli-groups', async () => {
    return { items: await listFsliGroups(app.prisma) };
  });

  app.get('/engagements/:engagementId/mappings', async (req) => {
    const { engagementId } = req.params as { engagementId: string };
    return { items: await listMappings(app.prisma, req.user, engagementId) };
  });

  app.put('/engagements/:engagementId/mappings', async (req) => {
    const { engagementId } = req.params as { engagementId: string };
    return saveMappings(app.prisma, req.user, engagementId, mappingsUpdateSchema.parse(req.body));
  });
};
