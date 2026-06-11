import type { ComponentType, ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
}

/** Every empty table/list renders this with the next action (docs/DESIGN.md §5). */
export function EmptyState({ icon: Icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      {Icon && <Icon className="h-8 w-8 text-ink-faint" aria-hidden />}
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] text-ink-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
