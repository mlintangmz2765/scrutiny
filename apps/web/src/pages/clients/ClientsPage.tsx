import { Building2 } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '../../components/ui';

export function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        description="Audit clients of the firm."
        actions={<Button disabled>New client</Button>}
      />
      <EmptyState
        icon={Building2}
        title="Client management is not built yet"
        hint="It arrives with Phase 1 (tasks T-01.4 and T-01.5)."
      />
    </>
  );
}
