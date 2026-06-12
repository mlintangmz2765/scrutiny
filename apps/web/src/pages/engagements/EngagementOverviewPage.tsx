import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserMinus } from 'lucide-react';
import { useState } from 'react';
import {
  ENGAGEMENT_STATUS_ORDER,
  type EngagementMemberRecord,
  type UserPublic,
} from '@scrutiny/shared';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import { ApiError, apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useEngagement } from './EngagementLayout';

export function EngagementOverviewPage() {
  const engagement = useEngagement();
  const user = useAuth();
  const queryClient = useQueryClient();
  const isManagerUp = user.role === 'MANAGER' || user.role === 'PARTNER' || user.role === 'ADMIN';
  const archived = engagement.status === 'ARCHIVED';

  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: ['engagement', engagement.id, 'members'],
    queryFn: () =>
      apiFetch<{ items: EngagementMemberRecord[] }>(`/engagements/${engagement.id}/members`),
  });

  const { data: users } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => apiFetch<{ items: UserPublic[]; total: number }>('/users?pageSize=500'),
    enabled: isManagerUp,
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['engagement', engagement.id] }),
      queryClient.invalidateQueries({ queryKey: ['engagements'] }),
    ]);
  }

  const advance = useMutation({
    mutationFn: (target: string) =>
      apiFetch(`/engagements/${engagement.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ target }),
      }),
    onSuccess: refresh,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Status change failed.'),
  });

  const addMember = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/engagements/${engagement.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    onSuccess: async () => {
      setSelectedUserId('');
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['engagement', engagement.id, 'members'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not add member.'),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/engagements/${engagement.id}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['engagement', engagement.id, 'members'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not remove member.'),
  });

  const statusIdx = ENGAGEMENT_STATUS_ORDER.indexOf(engagement.status);
  const next = ENGAGEMENT_STATUS_ORDER[statusIdx + 1];
  const nextLabel = next ? next.charAt(0) + next.slice(1).toLowerCase() : null;

  const memberIds = new Set(members?.items.map((m) => m.userId));
  const candidates = users?.items.filter((u) => u.isActive && !memberIds.has(u.id)) ?? [];

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>
      )}

      <Card>
        <CardHeader
          title="Status"
          description="Stages move forward one step at a time; archiving happens from the completion checklist."
          actions={
            isManagerUp && next && next !== 'ARCHIVED' && !archived ? (
              <Button onClick={() => advance.mutate(next)} disabled={advance.isPending}>
                {advance.isPending ? 'Moving…' : `Advance to ${nextLabel}`}
              </Button>
            ) : undefined
          }
        />
        <CardBody className="flex items-center gap-2">
          {ENGAGEMENT_STATUS_ORDER.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="h-px w-6 bg-border-strong" aria-hidden />}
              <Badge tone={i === statusIdx ? 'info' : i < statusIdx ? 'success' : 'neutral'}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </Badge>
            </span>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Team" description="Only members can see this engagement." />
        <CardBody className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                {isManagerUp && !archived && <TH className="w-16" />}
              </TR>
            </THead>
            <TBody>
              {members?.items.map((m) => (
                <TR key={m.userId}>
                  <TD className="font-medium">{m.name}</TD>
                  <TD className="text-ink-muted">{m.email}</TD>
                  <TD className="text-ink-muted capitalize">{m.role.toLowerCase()}</TD>
                  {isManagerUp && !archived && (
                    <TD>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => removeMember.mutate(m.userId)}
                      >
                        <UserMinus className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>

          {isManagerUp && !archived && (
            <div className="flex items-end gap-2">
              <div className="w-72">
                <Select
                  aria-label="Add member"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Add a member…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toLowerCase()})
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="secondary"
                disabled={!selectedUserId || addMember.isPending}
                onClick={() => addMember.mutate(selectedUserId)}
              >
                Add member
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
