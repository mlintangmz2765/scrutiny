import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-ink-muted',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
  accent: 'bg-accent-tint text-accent',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
