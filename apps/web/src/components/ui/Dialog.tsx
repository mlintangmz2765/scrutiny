import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Modal built on the native <dialog> element. */
export function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="backdrop:bg-ink/40 m-auto w-full max-w-md rounded-card border border-border bg-surface p-0 shadow-pop"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-control p-1 text-ink-muted hover:bg-sunken hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="px-4 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">{footer}</div>
      )}
    </dialog>
  );
}
