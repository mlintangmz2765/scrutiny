import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { AccountMappingRow, FsliGroupRecord } from '@scrutiny/shared';
import {
  Amount,
  Badge,
  Button,
  EmptyState,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import { ApiError, apiFetch } from '../../lib/api';
import { useEngagement } from '../engagements/EngagementLayout';

export function MappingPage() {
  const engagement = useEngagement();
  const queryClient = useQueryClient();
  const archived = engagement.status === 'ARCHIVED';

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: groupsData } = useQuery({
    queryKey: ['fsli-groups'],
    queryFn: () => apiFetch<{ items: FsliGroupRecord[] }>('/fsli-groups'),
    staleTime: Infinity,
  });
  const { data: mappingsData, isPending } = useQuery({
    queryKey: ['engagement', engagement.id, 'mappings'],
    queryFn: () => apiFetch<{ items: AccountMappingRow[] }>(`/engagements/${engagement.id}/mappings`),
  });

  const groups = useMemo(() => groupsData?.items ?? [], [groupsData]);
  const rows = useMemo(() => mappingsData?.items ?? [], [mappingsData]);
  const groupIdByCode = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.code, g.id])),
    [groups],
  );

  // Server state is the draft's starting point; user edits overlay it.
  useEffect(() => {
    setDraft(
      Object.fromEntries(rows.map((r) => [r.accountId, r.fsliGroupId ?? ''])),
    );
  }, [rows]);

  const save = useMutation({
    mutationFn: () => {
      const payload = Object.entries(draft)
        .filter(([, fsliGroupId]) => fsliGroupId !== '')
        .map(([accountId, fsliGroupId]) => ({ accountId, fsliGroupId }));
      return apiFetch(`/engagements/${engagement.id}/mappings`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['engagement', engagement.id, 'mappings'] }),
        queryClient.invalidateQueries({ queryKey: ['engagement', engagement.id, 'trial-balance'] }),
      ]);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Save failed.'),
  });

  function applyAllSuggestions() {
    setDraft((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (next[row.accountId] === '' && row.suggestedFsliCode) {
          const id = groupIdByCode[row.suggestedFsliCode];
          if (id) next[row.accountId] = id;
        }
      }
      return next;
    });
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No accounts yet"
        hint="Import a trial balance first — accounts appear here for FSLI mapping."
      />
    );
  }

  const unmappedCount = rows.filter((r) => (draft[r.accountId] ?? '') === '').length;
  const visible = unmappedOnly ? rows.filter((r) => (draft[r.accountId] ?? '') === '') : rows;
  const dirty = rows.some((r) => (draft[r.accountId] ?? '') !== (r.fsliGroupId ?? ''));
  const bsGroups = groups.filter((g) => g.statement === 'BS');
  const isGroups = groups.filter((g) => g.statement === 'IS');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {unmappedCount > 0 ? (
          <Badge tone="warning">{unmappedCount} unmapped</Badge>
        ) : (
          <Badge tone="success">All mapped</Badge>
        )}
        <label className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={unmappedOnly}
            onChange={(e) => setUnmappedOnly(e.target.checked)}
          />
          Unmapped only
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={applyAllSuggestions} disabled={archived}>
            Apply all suggestions
          </Button>
          <Button onClick={() => save.mutate()} disabled={archived || !dirty || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save mappings'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">{error}</p>
      )}

      <Table>
        <THead>
          <TR>
            <TH>Code</TH>
            <TH>Account</TH>
            <TH className="text-right">CY amount</TH>
            <TH>FSLI group</TH>
            <TH>Suggestion</TH>
          </TR>
        </THead>
        <TBody>
          {visible.map((row) => {
            const suggestion =
              row.suggestedFsliCode !== null
                ? groups.find((g) => g.code === row.suggestedFsliCode)
                : undefined;
            return (
              <TR key={row.accountId}>
                <TD>{row.accountCode}</TD>
                <TD>{row.accountName}</TD>
                <TD className="text-right">
                  <Amount value={row.currentAmount} minorUnitsPerMajor={engagement.minorUnitsPerMajor} />
                </TD>
                <TD>
                  <Select
                    aria-label={`FSLI group for ${row.accountCode}`}
                    className="min-w-56"
                    value={draft[row.accountId] ?? ''}
                    disabled={archived}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [row.accountId]: e.target.value }))
                    }
                  >
                    <option value="">— unmapped —</option>
                    <optgroup label="Balance sheet">
                      {bsGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.code} · {g.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Income statement">
                      {isGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.code} · {g.name}
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                </TD>
                <TD>
                  {suggestion && (draft[row.accountId] ?? '') !== suggestion.id ? (
                    <button
                      type="button"
                      className="rounded-full bg-accent-tint px-2 py-0.5 text-xs font-medium text-accent hover:opacity-80"
                      disabled={archived}
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, [row.accountId]: suggestion.id }))
                      }
                    >
                      {suggestion.code} · {suggestion.name}
                    </button>
                  ) : suggestion ? (
                    <span className="text-xs text-ink-faint">applied</span>
                  ) : (
                    <span className="text-xs text-ink-faint">—</span>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
