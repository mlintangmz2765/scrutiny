import { describe, expect, it } from 'vitest';
import {
  FSLI_GROUPS,
  fsliStatementSchema,
  normalSignSchema,
  tbImportKindSchema,
} from './trial-balance.js';

describe('FSLI taxonomy (DOMAIN.md §2)', () => {
  it('has exactly the 24 standard groups', () => {
    expect(FSLI_GROUPS).toHaveLength(24);
  });

  it('has unique codes', () => {
    const codes = FSLI_GROUPS.map((g) => g.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('uses only valid statements and normal signs', () => {
    for (const group of FSLI_GROUPS) {
      expect(() => fsliStatementSchema.parse(group.statement)).not.toThrow();
      expect(() => normalSignSchema.parse(group.normalSign)).not.toThrow();
    }
  });

  it('matches DOMAIN.md §2 for spot-checked rows', () => {
    const byCode = Object.fromEntries(FSLI_GROUPS.map((g) => [g.code, g]));
    expect(byCode['A.1']).toEqual({
      code: 'A.1',
      name: 'Cash and cash equivalents',
      statement: 'BS',
      normalSign: 'DR',
    });
    expect(byCode['R.1']).toEqual({
      code: 'R.1',
      name: 'Revenue',
      statement: 'IS',
      normalSign: 'CR',
    });
    expect(byCode['X.5']).toEqual({
      code: 'X.5',
      name: 'Income tax expense',
      statement: 'IS',
      normalSign: 'DR',
    });
  });

  it('orders balance-sheet groups (A/L/E) before income-statement groups (R/X)', () => {
    const firstIsIndex = FSLI_GROUPS.findIndex((g) => g.statement === 'IS');
    const lastBsIndex = FSLI_GROUPS.map((g) => g.statement).lastIndexOf('BS');
    expect(lastBsIndex).toBeLessThan(firstIsIndex);
  });
});

describe('trial balance import kind', () => {
  it('accepts CURRENT and PRIOR only', () => {
    expect(tbImportKindSchema.options).toEqual(['CURRENT', 'PRIOR']);
    expect(() => tbImportKindSchema.parse('OTHER')).toThrow();
  });
});
