import multipart from '@fastify/multipart';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { tbColumnMapSchema, tbImportKindSchema, type TbColumnMap, type TbImportKind } from '@scrutiny/shared';
import { AppError } from '../../lib/app-error.js';
import { getTrialBalanceOverview, importTrialBalance, previewTrialBalance } from './service.js';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

interface UploadPayload {
  file: { buffer: Buffer; fileName: string };
  columnMap: TbColumnMap;
  kind: TbImportKind;
}

/** Reads the multipart upload: one file part + `columnMap` (JSON) + `kind` fields. */
async function readUpload(req: FastifyRequest): Promise<UploadPayload> {
  let file: UploadPayload['file'] | null = null;
  const fields: Record<string, string> = {};

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      if (file) throw new AppError('VALIDATION', 400, 'Upload exactly one file.');
      file = { buffer: await part.toBuffer(), fileName: part.filename };
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }
  if (!file) throw new AppError('VALIDATION', 400, 'A trial balance file is required.');

  let columnMapRaw: unknown;
  try {
    columnMapRaw = JSON.parse(fields.columnMap ?? '');
  } catch {
    throw new AppError('VALIDATION', 400, 'columnMap must be valid JSON.');
  }
  const columnMap = tbColumnMapSchema.parse(columnMapRaw);
  const kind = tbImportKindSchema.parse(fields.kind);
  return { file, columnMap, kind };
}

export const trialBalanceRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, { limits: { fileSize: MAX_FILE_BYTES, files: 1 } });

  app.post('/engagements/:engagementId/trial-balance/preview', async (req) => {
    const { engagementId } = req.params as { engagementId: string };
    const { file, columnMap } = await readUpload(req);
    return previewTrialBalance(app.prisma, req.user, engagementId, file, columnMap);
  });

  app.post('/engagements/:engagementId/trial-balance/import', async (req, reply) => {
    const { engagementId } = req.params as { engagementId: string };
    const { file, columnMap, kind } = await readUpload(req);
    const summary = await importTrialBalance(app.prisma, req.user, engagementId, file, columnMap, kind);
    return reply.code(201).send(summary);
  });

  app.get('/engagements/:engagementId/trial-balance', async (req) => {
    const { engagementId } = req.params as { engagementId: string };
    return getTrialBalanceOverview(app.prisma, req.user, engagementId);
  });
};
