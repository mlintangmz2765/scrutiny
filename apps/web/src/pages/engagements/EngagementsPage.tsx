import { FolderOpen } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '../../components/ui';

export function EngagementsPage() {
  return (
    <>
      <PageHeader
        title="Engagements"
        description="Your audit engagements, one per client fiscal year."
        actions={<Button disabled>New engagement</Button>}
      />
      <EmptyState
        icon={FolderOpen}
        title="Engagement management is not built yet"
        hint="It arrives with Phase 1 (tasks T-01.6 and T-01.7)."
      />
    </>
  );
}
