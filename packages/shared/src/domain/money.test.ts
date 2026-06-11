import { describe, expect, it } from 'vitest';
import { assertSafeAmount, bigIntToAmount, roundHalfAwayFromZero } from './money.js';

describe('roundHalfAwayFromZero', () => {
  it('rounds halves away from zero', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
  });

  it('rounds the DOMAIN.md materiality example up', () => {
    expect(roundHalfAwayFromZero(617283.9)).toBe(617284);
  });

  it('rounds below-half toward zero', () => {
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(roundHalfAwayFromZero(-2.4)).toBe(-2);
  });

  it('keeps integers unchanged', () => {
    expect(roundHalfAwayFromZero(0)).toBe(0);
    expect(roundHalfAwayFromZero(-7)).toBe(-7);
  });
});

describe('assertSafeAmount', () => {
  it('accepts safe integers', () => {
    expect(() => assertSafeAmount(2 ** 53 - 1)).not.toThrow();
    expect(() => assertSafeAmount(-(2 ** 53 - 1))).not.toThrow();
    expect(() => assertSafeAmount(0)).not.toThrow();
  });

  it('rejects unsafe or non-integer values', () => {
    expect(() => assertSafeAmount(2 ** 53)).toThrow(RangeError);
    expect(() => assertSafeAmount(1.5)).toThrow(RangeError);
    expect(() => assertSafeAmount(Number.NaN)).toThrow(RangeError);
  });
});

describe('bigIntToAmount', () => {
  it('converts in-range bigints', () => {
    expect(bigIntToAmount(123456789n)).toBe(123456789);
    expect(bigIntToAmount(-42n)).toBe(-42);
  });

  it('rejects bigints beyond the safe range', () => {
    expect(() => bigIntToAmount(2n ** 53n)).toThrow(RangeError);
  });
});
