import { z } from 'zod';

/** Standard list pagination (ARCHITECTURE.md §4): ?page=1&pageSize=50, max 500. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
