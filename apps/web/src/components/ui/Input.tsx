import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const controlClasses =
  'w-full rounded-control border border-border-strong bg-surface text-sm text-ink ' +
  'placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-50';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, 'h-9 px-3', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, 'h-9 px-2.5', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, 'min-h-24 px-3 py-2', className)} {...props} />;
}
