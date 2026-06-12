import { useQuery } from '@tanstack/react-query';
import { Building2, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import type { ClientRecord } from '@scrutiny/shared';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { ClientFormDialog } from './ClientFormDialog';

const PAGE_SIZE = 25;

export function ClientsPage() {
  const user = useAuth();
  const canEdit = user.role === 'MANAGER' || user.role === 'PARTNER' || user.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) params.set('search', search.trim());

  const { data, isPending } = useQuery({
    queryKey: ['clients', { search: search.trim(), page }],
    queryFn: () => apiFetch<{ items: ClientRecord[]; total: number }>(`/clients?${params}`),
  });

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(client: ClientRecord) {
    setEditing(client);
    setDialogOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Audit clients of the firm."
        actions={canEdit ? <Button onClick={openCreate}>New client</Button> : undefined}
      />

      <div className="mb-4 max-w-xs">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <Input
            aria-label="Search clients"
            placeholder="Search by name…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Building2}
          title={search ? 'No clients match your search' : 'No clients yet'}
          hint={search ? 'Try a different name.' : 'Create the first client to start an engagement.'}
          action={
            canEdit && !search ? <Button onClick={openCreate}>New client</Button> : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Industry</TH>
                <TH>Contact</TH>
                <TH>Status</TH>
                {canEdit && <TH className="w-16" />}
              </TR>
            </THead>
            <TBody>
              {data?.items.map((client) => (
                <TR key={client.id}>
                  <TD className="font-medium">{client.name}</TD>
                  <TD className="text-ink-muted">{client.industry ?? '—'}</TD>
                  <TD className="text-ink-muted">
                    {client.contactName ?? '—'}
                    {client.contactEmail ? (
                      <span className="block text-xs text-ink-faint">{client.contactEmail}</span>
                    ) : null}
                  </TD>
                  <TD>
                    <Badge tone={client.isActive ? 'success' : 'neutral'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  {canEdit && (
                    <TD>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${client.name}`}
                        onClick={() => openEdit(client)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="mt-3 flex items-center justify-between text-[13px] text-ink-muted">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <span className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </span>
          </div>
        </>
      )}

      <ClientFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} client={editing} />
    </>
  );
}
