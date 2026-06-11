import { cn } from '../../lib/cn';
import { formatAmount } from '../../lib/format';

export interface AmountProps {
  /** Integer minor units (ARCHITECTURE.md §6). */
  value: number | null | undefined;
  minorUnitsPerMajor?: number;
  className?: string;
}

/** The only sanctioned way to render money: tabular figures, parentheses negatives. */
export function Amount({ value, minorUnitsPerMajor = 100, className }: AmountProps) {
  const negative = typeof value === 'number' && value < 0;
  return (
    <span className={cn('tnum whitespace-nowrap', negative && 'text-danger', className)}>
      {formatAmount(value, minorUnitsPerMajor)}
    </span>
  );
}
