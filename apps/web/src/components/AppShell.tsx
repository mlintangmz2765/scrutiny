import { useQuery } from '@tanstack/react-query';
import { Building2, FolderOpen, LayoutDashboard, Palette, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/cn';

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2, end: false },
  { to: '/engagements', label: 'Engagements', icon: FolderOpen, end: false },
];

function navLinkClasses(isActive: boolean): string {
  return cn(
    'flex items-center gap-2.5 rounded-control px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary-tint text-primary' : 'text-ink-muted hover:bg-sunken hover:text-ink',
  );
}

function ApiStatus() {
  const { isSuccess } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiFetch<{ status: string }>('/health'),
    retry: false,
    refetchInterval: 30_000,
  });
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <span
        className={cn('h-2 w-2 rounded-full', isSuccess ? 'bg-success' : 'bg-ink-faint')}
        aria-hidden
      />
      {isSuccess ? 'API: ok' : 'API: offline'}
    </span>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-[248px] flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary">
            <ShieldCheck className="h-5 w-5 text-white" aria-hidden />
          </span>
          <span>
            <span className="block text-base leading-tight font-semibold text-ink">Scrutiny</span>
            <span className="block text-xs text-ink-muted">Audit platform</span>
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Primary">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-border px-3 py-3">
          <NavLink to="/design" className={({ isActive }) => navLinkClasses(isActive)}>
            <Palette className="h-4 w-4" aria-hidden />
            Design system
          </NavLink>
          <div className="mt-2 flex items-center gap-2.5 px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ink-muted">
              ?
            </span>
            <span>
              <span className="block text-[13px] leading-tight font-medium text-ink">
                Not signed in
              </span>
              <span className="block text-xs text-ink-faint">Sign-in arrives with Phase 1</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[248px]">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
          <span className="text-[13px] text-ink-muted">Pre-alpha — foundation build</span>
          <ApiStatus />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
