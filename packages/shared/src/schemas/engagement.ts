import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

/** Forward-only workflow (DOMAIN.md §1); ADMIN may step back one stage. */
export const engagementStatusSchema = z.enum([
  'PLANNING',
  'FIELDWORK',
  'REVIEW',
  'COMPLETION',
  'ARCHIVED',
]);
export type EngagementStatus = z.infer<typeof engagementStatusSchema>;

export const ENGAGEMENT_STATUS_ORDER: readonly EngagementStatus[] =
  engagementStatusSchema.options;

/** Fiscal period boundaries travel as YYYY-MM-DD strings (ARCHITECTURE.md §6). */
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

const engagementBaseSchema = z.object({
  name: z.string().min(1),
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  currencyCode: z.string().regex(/^[A-Z]{3}$/, 'Expected an ISO 4217 code like USD'),
  minorUnitsPerMajor: z.number().int().positive(),
});

export const engagementCreateSchema = engagementBaseSchema
  .extend({
    clientId: z.string().min(1),
    currencyCode: engagementBaseSchema.shape.currencyCode.default('USD'),
    minorUnitsPerMajor: engagementBaseSchema.shape.minorUnitsPerMajor.default(100),
  })
  .refine((d) => d.periodEnd > d.periodStart, {
    message: 'periodEnd must be after periodStart',
    path: ['periodEnd'],
  });
export type EngagementCreateInput = z.infer<typeof engagementCreateSchema>;

/** Cross-field period validation runs in the service against merged values. */
export const engagementUpdateSchema = engagementBaseSchema.partial().strict();
export type EngagementUpdateInput = z.infer<typeof engagementUpdateSchema>;

export const engagementListQuerySchema = paginationQuerySchema.extend({
  clientId: z.string().optional(),
  status: engagementStatusSchema.optional(),
});
export type EngagementListQuery = z.infer<typeof engagementListQuerySchema>;

export const statusTransitionSchema = z.object({
  target: engagementStatusSchema,
});
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;

export const memberAddSchema = z.object({
  userId: z.string().min(1),
});

/** Shape of an engagement as returned by the API. */
export interface EngagementRecord {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  currencyCode: string;
  minorUnitsPerMajor: number;
  status: EngagementStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementMemberRecord {
  userId: string;
  name: string;
  email: string;
  role: string;
}
