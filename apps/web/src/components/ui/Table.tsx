import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-card border border-border bg-surface shadow-card',
        className,
      )}
    >
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-sunken">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ className, children }: { className?: string; children: ReactNode }) {
  return <tr className={cn('border-b border-border last:border-b-0', className)}>{children}</tr>;
}

export function TH({
  numeric,
  className,
  children,
}: {
  numeric?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th
      className={cn(
        'border-b border-border px-3 py-2 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase',
        numeric && 'text-right',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  numeric,
  className,
  children,
}: {
  numeric?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <td
      className={cn('px-3 py-2 align-middle text-ink', numeric && 'tnum text-right', className)}
    >
      {children}
    </td>
  );
}

/** Totals row per docs/DESIGN.md §4: semibold with a strong top rule. */
export function TotalsRow({ children }: { children: ReactNode }) {
  return <tr className="border-t border-border-strong bg-surface font-semibold">{children}</tr>;
}
