/**
 * Formats an integer minor-unit amount for display (docs/DESIGN.md §3):
 * thousands grouping, fixed decimals derived from minorUnitsPerMajor,
 * negatives in accounting parentheses, null/undefined as an em dash.
 */
export function formatAmount(
  minorUnits: number | null | undefined,
  minorUnitsPerMajor = 100,
): string {
  if (minorUnits === null || minorUnits === undefined) return '—';

  const decimals = Math.max(0, Math.round(Math.log10(minorUnitsPerMajor)));
  const major = Math.abs(minorUnits) / minorUnitsPerMajor;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);

  return minorUnits < 0 ? `(${formatted})` : formatted;
}
