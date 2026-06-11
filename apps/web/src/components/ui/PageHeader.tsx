import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Every page starts with one of these (docs/DESIGN.md §4). */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
