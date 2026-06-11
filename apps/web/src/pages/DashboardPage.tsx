import { Building2, ClipboardCheck, FolderOpen, MessageSquareWarning } from 'lucide-react';
import { Button, Card, CardBody, EmptyState, PageHeader } from '../components/ui';

const stats = [
  { label: 'Active engagements', value: 0, icon: FolderOpen, note: 'Phase 1' },
  { label: 'Clients', value: 0, icon: Building2, note: 'Phase 1' },
  { label: 'Open review notes', value: 0, icon: MessageSquareWarning, note: 'Phase 7' },
  { label: 'Pending sign-offs', value: 0, icon: ClipboardCheck, note: 'Phase 7' },
];

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Firm-wide overview of engagements and review work."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody className="flex items-start justify-between">
              <div>
                <p className="text-[13px] text-ink-muted">{stat.label}</p>
                <p className="tnum mt-1 text-2xl font-semibold text-ink">{stat.value}</p>
                <p className="mt-1 text-xs text-ink-faint">Arrives with {stat.note}</p>
              </div>
              <stat.icon className="h-5 w-5 text-ink-faint" aria-hidden />
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <EmptyState
          icon={FolderOpen}
          title="No engagements yet"
          hint="Engagement management arrives with Phase 1. Build progress is tracked in docs/PROGRESS.md."
          action={<Button disabled>Create engagement</Button>}
        />
      </div>
    </>
  );
}
