import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const clientCreateSchema = z.object({
  name: z.string().min(1),
  registrationNumber: z.string().optional(),
  industry: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().optional(),
});
export type ClientCreateInput = z.infer<typeof clientCreateSchema>;

/** isActive changes are ADMIN-only (enforced in the service). */
export const clientUpdateSchema = clientCreateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .strict();
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

export const clientListQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
