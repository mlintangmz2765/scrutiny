import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-white hover:bg-primary-hover',
  secondary: 'border-border-strong bg-surface text-ink hover:bg-sunken',
  ghost: 'border-transparent bg-transparent text-ink-muted hover:bg-sunken hover:text-ink',
  danger: 'border-transparent bg-danger text-white hover:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', size = 'md', className, type, ...props }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-control border font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
