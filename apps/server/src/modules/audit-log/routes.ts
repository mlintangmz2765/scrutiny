import type { FastifyPluginAsync } from 'fastify';
import { paginationQuerySchema } from '@scrutiny/shared';
import { MANAGER_AND_UP, requireRole } from '../../lib/authz.js';
import { requireEngagementAccess } from '../../lib/engagement-access.js';
import { listAuditLog } from './service.js';

export const auditLogRoutes: FastifyPluginAsync = async (app) => {
  app.get('/engagements/:id/audit-log', async (req) => {
    const { id } = req.params as { id: string };
    await requireEngagementAccess(app.prisma, req.user, id);
    requireRole(req.user, MANAGER_AND_UP);
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    return listAuditLog(app.prisma, { engagementId: id, page, pageSize });
  });

  app.get('/audit-log', async (req) => {
    requireRole(req.user, ['ADMIN']);
    const { page, pageSize } = paginationQuerySchema.parse(req.query);
    return listAuditLog(app.prisma, { page, pageSize });
  });
};
