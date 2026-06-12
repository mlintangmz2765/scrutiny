import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ENGAGEMENT_STATUS_ORDER,
  type ClientRecord,
  type EngagementRecord,
  type EngagementStatus,
} from '@scrutiny/shared';
import {
  Button,
  EmptyState,
  PageHeader,
  Select,
  Spinner,
  StatusChip,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function EngagementsPage() {
  const user = useAuth();
  const navigate = useNavigate();
  const canCreate = user.role === 'MANAGER' || user.role === 'PARTNER' || user.role === 'ADMIN';

  const [status, setStatus] = useState<'' | EngagementStatus>('');
  const [clientId, setClientId] = useState('');

  const { data: clients } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => apiFetch<{ items: ClientRecord[]; total: number }>('/clients?pageSize=500'),
  });

  const params = new URLSearchParams({ pageSize: '500' });
  if (status) params.set('status', status);
  if (clientId) params.set('clientId', clientId);

  const { data, isPending } = useQuery({
    queryKey: ['engagements', { status, clientId }],
    queryFn: () =>
      apiFetch<{ items: EngagementRecord[]; total: number }>(`/engagements?${params}`),
  });

  return (
    <>
      <PageHeader
        title="Engagements"
        description="Your audit engagements, one per client fiscal year."
        actions={
          canCreate ? (
            <Button onClick={() => navigate('/engagements/new')}>New engagement</Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-3">
        <Select
          aria-label="Filter by status"
          className="w-44"
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | EngagementStatus)}
        >
          <option value="">All statuses</option>
          {ENGAGEMENT_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by client"
          className="w-56"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">All clients</option>
          {clients?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (data?.total ?? 0) === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No engagements found"
          hint={
            canCreate
              ? 'Create an engagement to start an audit.'
              : 'Ask a manager to add you to an engagement.'
          }
          action={
            canCreate ? (
              <Button onClick={() => navigate('/engagements/new')}>New engagement</Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Engagement</TH>
              <TH>Client</TH>
              <TH>Period</TH>
              <TH>Members</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {data?.items.map((e) => (
              <TR key={e.id} className="hover:bg-sunken/50">
                <TD className="font-medium">
                  <Link to={`/engagements/${e.id}`} className="text-primary hover:underline">
                    {e.name}
                  </Link>
                </TD>
                <TD className="text-ink-muted">{e.clientName}</TD>
                <TD className="tnum text-ink-muted">
                  {e.periodStart} → {e.periodEnd}
                </TD>
                <TD numeric>{e.memberCount}</TD>
                <TD>
                  <StatusChip status={e.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
