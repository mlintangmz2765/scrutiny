import type { ReactNode } from 'react';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

/** Label + control + hint/error, stacked per docs/DESIGN.md §4 (forms). */
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
