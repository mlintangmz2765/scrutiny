import { Badge, type BadgeTone } from './Badge';

export type EngagementStatus = 'PLANNING' | 'FIELDWORK' | 'REVIEW' | 'COMPLETION' | 'ARCHIVED';

const statusConfig: Record<EngagementStatus, { label: string; tone: BadgeTone }> = {
  PLANNING: { label: 'Planning', tone: 'info' },
  FIELDWORK: { label: 'Fieldwork', tone: 'accent' },
  REVIEW: { label: 'Review', tone: 'warning' },
  COMPLETION: { label: 'Completion', tone: 'success' },
  ARCHIVED: { label: 'Archived', tone: 'neutral' },
};

export function StatusChip({ status }: { status: EngagementStatus }) {
  const { label, tone } = statusConfig[status];
  return <Badge tone={tone}>{label}</Badge>;
}
