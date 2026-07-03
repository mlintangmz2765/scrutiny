import { z } from 'zod';

/** Which statement an FSLI group belongs to (DOMAIN.md §2). */
export const fsliStatementSchema = z.enum(['BS', 'IS']);
export type FsliStatement = z.infer<typeof fsliStatementSchema>;

/** Normal balance side of an FSLI group (DOMAIN.md §2). Debit +, credit −. */
export const normalSignSchema = z.enum(['DR', 'CR']);
export type NormalSign = z.infer<typeof normalSignSchema>;

/** A trial balance import is either the current year or the prior year (DOMAIN.md §2). */
export const tbImportKindSchema = z.enum(['CURRENT', 'PRIOR']);
export type TbImportKind = z.infer<typeof tbImportKindSchema>;

/**
 * How source-file columns map onto trial-balance fields: either one signed
 * `balance` column, or separate positive-magnitude `debit` + `credit` columns.
 * The decimal separator is explicit — the parser never guesses (DOMAIN.md §2).
 */
export const tbColumnMapSchema = z
  .object({
    accountCode: z.string().min(1),
    accountName: z.string().min(1),
    balance: z.string().min(1).optional(),
    debit: z.string().min(1).optional(),
    credit: z.string().min(1).optional(),
    decimalSeparator: z.enum(['.', ',']),
    delimiter: z.enum([',', ';']).optional(),
  })
  .refine((m) => m.balance !== undefined || (m.debit !== undefined && m.credit !== undefined), {
    message: 'columnMap must define either "balance" or both "debit" and "credit".',
  });
export type TbColumnMap = z.infer<typeof tbColumnMapSchema>;

export interface FsliGroupSeed {
  code: string;
  name: string;
  statement: FsliStatement;
  normalSign: NormalSign;
}

/**
 * Standard FSLI taxonomy. The sole authority is DOMAIN.md §2 — this array must match that
 * table exactly, in order. `sortOrder` is derived from the array index by the seed.
 */
export const FSLI_GROUPS: readonly FsliGroupSeed[] = [
  { code: 'A.1', name: 'Cash and cash equivalents', statement: 'BS', normalSign: 'DR' },
  { code: 'A.2', name: 'Trade receivables', statement: 'BS', normalSign: 'DR' },
  { code: 'A.3', name: 'Other receivables', statement: 'BS', normalSign: 'DR' },
  { code: 'A.4', name: 'Inventories', statement: 'BS', normalSign: 'DR' },
  { code: 'A.5', name: 'Prepayments and other current assets', statement: 'BS', normalSign: 'DR' },
  { code: 'A.6', name: 'Property, plant and equipment', statement: 'BS', normalSign: 'DR' },
  { code: 'A.7', name: 'Intangible assets', statement: 'BS', normalSign: 'DR' },
  {
    code: 'A.8',
    name: 'Investments and other non-current assets',
    statement: 'BS',
    normalSign: 'DR',
  },
  { code: 'L.1', name: 'Trade payables', statement: 'BS', normalSign: 'CR' },
  { code: 'L.2', name: 'Accrued liabilities and provisions', statement: 'BS', normalSign: 'CR' },
  { code: 'L.3', name: 'Borrowings — current', statement: 'BS', normalSign: 'CR' },
  { code: 'L.4', name: 'Borrowings — non-current', statement: 'BS', normalSign: 'CR' },
  { code: 'L.5', name: 'Tax payables', statement: 'BS', normalSign: 'CR' },
  { code: 'L.6', name: 'Other liabilities', statement: 'BS', normalSign: 'CR' },
  { code: 'E.1', name: 'Share capital', statement: 'BS', normalSign: 'CR' },
  { code: 'E.2', name: 'Retained earnings', statement: 'BS', normalSign: 'CR' },
  { code: 'E.3', name: 'Other equity', statement: 'BS', normalSign: 'CR' },
  { code: 'R.1', name: 'Revenue', statement: 'IS', normalSign: 'CR' },
  { code: 'R.2', name: 'Other income', statement: 'IS', normalSign: 'CR' },
  { code: 'X.1', name: 'Cost of sales', statement: 'IS', normalSign: 'DR' },
  { code: 'X.2', name: 'Operating expenses', statement: 'IS', normalSign: 'DR' },
  { code: 'X.3', name: 'Depreciation and amortization', statement: 'IS', normalSign: 'DR' },
  { code: 'X.4', name: 'Finance costs', statement: 'IS', normalSign: 'DR' },
  { code: 'X.5', name: 'Income tax expense', statement: 'IS', normalSign: 'DR' },
];

/** Shape of an FSLI group as returned by the API. */
export interface FsliGroupRecord {
  id: string;
  code: string;
  name: string;
  statement: FsliStatement;
  normalSign: NormalSign;
  sortOrder: number;
}
