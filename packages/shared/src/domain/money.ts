/**
 * Monetary amounts are integers in minor units (ARCHITECTURE.md §6).
 * These helpers are the only sanctioned way to validate and round them.
 */

/** Throws unless `n` is a safe integer (a valid minor-unit amount). */
export function assertSafeAmount(n: number): void {
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Amount is not a safe integer of minor units: ${n}`);
  }
}

/**
 * Converts a Prisma BigInt amount to a JS number, refusing values outside the
 * safe-integer range.
 */
export function bigIntToAmount(value: bigint): number {
  const n = Number(value);
  assertSafeAmount(n);
  return n;
}

/**
 * Rounding rule for all derived amounts (materiality, projections):
 * half away from zero, to an integer minor unit. No other rounding is allowed.
 */
export function roundHalfAwayFromZero(x: number): number {
  return x >= 0 ? Math.floor(x + 0.5) : -Math.floor(-x + 0.5);
}
