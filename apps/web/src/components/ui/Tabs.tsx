import { cn } from '../../lib/cn';

export interface TabItem {
  id: string;
  label: string;
}

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-border">
      {items.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          className={cn(
            '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            tab.id === active
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
