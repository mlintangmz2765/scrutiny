import { describe, expect, it } from 'vitest';
import { suggestFsli } from './mapping-suggest.js';

describe('suggestFsli (T-02.5 keyword table)', () => {
  const cases: [string, string | null][] = [
    ['Cash on hand', 'A.1'],
    ['Bank current account', 'A.1'],
    ['Trade receivables', 'A.2'],
    ['Sundry debtors', 'A.2'],
    ['Inventory', 'A.4'],
    ['Stock in trade', 'A.4'],
    ['Prepaid expenses', 'A.5'],
    ['Property plant and equipment', 'A.6'],
    ['Motor vehicles', 'A.6'],
    ['Trade payables', 'L.1'],
    ['Sundry creditors', 'L.1'],
    ['Long-term borrowings', 'L.4'],
    ['Bank loan', 'L.4'],
    ['Share capital', 'E.1'],
    ['Retained earnings', 'E.2'],
    ['Revenue', 'R.1'],
    ['Sales income', 'R.1'],
    ['Cost of sales', 'X.1'],
    ['COGS', 'X.1'],
    ['Cost of goods sold', 'X.1'],
    ['Salaries expense', 'X.2'],
    ['Rent expense', 'X.2'],
    ['Utilities', 'X.2'],
    ['Office supplies', 'X.2'],
    ['Depreciation and amortization', 'X.3'],
    ['Interest expense', 'X.4'],
    ['Income tax expense', 'X.5'],
    ['Goodwill', null],
    ['Miscellaneous', null],
  ];

  it.each(cases)('suggests %s → %s', (name, expected) => {
    expect(suggestFsli(name)).toBe(expected);
  });

  it('is case-insensitive', () => {
    expect(suggestFsli('CASH AND BANK BALANCES')).toBe('A.1');
  });

  it('prefers cost of sales over the generic sales keyword', () => {
    expect(suggestFsli('Cost of sales')).toBe('X.1');
  });
});
