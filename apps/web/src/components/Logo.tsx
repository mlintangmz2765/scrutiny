import { cn } from '../lib/cn';

/**
 * The Scrutiny mark (lens + assurance check) as an app tile.
 * Keep in sync with /brand/*.svg — see brand/README.md.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-9 w-9', className)}
      role="img"
      aria-label="Scrutiny logo"
    >
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <circle cx="27.5" cy="27.5" r="13.5" fill="none" stroke="#ffffff" strokeWidth="5" />
      <line
        x1="40"
        y1="40"
        x2="51"
        y2="51"
        stroke="#d9ab4a"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M20.5 28l5 5 9-10.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
