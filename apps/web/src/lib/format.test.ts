import { describe, expect, it } from 'vitest';
import { formatAmount } from './format';

describe('formatAmount', () => {
  it('formats positive amounts with two decimals for cent currencies', () => {
    expect(formatAmount(123450)).toBe('1,234.50');
    expect(formatAmount(0)).toBe('0.00');
  });

  it('renders negatives in accounting parentheses', () => {
    expect(formatAmount(-123450)).toBe('(1,234.50)');
  });

  it('uses zero decimals for currencies without minor units', () => {
    expect(formatAmount(1234, 1)).toBe('1,234');
    expect(formatAmount(-1234, 1)).toBe('(1,234)');
  });

  it('renders null and undefined as an em dash', () => {
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount(undefined)).toBe('—');
  });
});
