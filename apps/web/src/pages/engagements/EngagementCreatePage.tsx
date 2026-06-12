import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ClientRecord, EngagementRecord } from '@scrutiny/shared';
import { Button, Card, CardBody, Field, Input, PageHeader, Select } from '../../components/ui';
import { ApiError, apiFetch } from '../../lib/api';

export function EngagementCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [minorUnitsPerMajor, setMinorUnitsPerMajor] = useState('100');
  const [error, setError] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => apiFetch<{ items: ClientRecord[]; total: number }>('/clients?pageSize=500'),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<EngagementRecord>('/engagements', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          name: name.trim(),
          periodStart,
          periodEnd,
          currencyCode,
          minorUnitsPerMajor: Number(minorUnitsPerMajor),
        }),
      }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['engagements'] });
      navigate(`/engagements/${created.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create the engagement.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clientId) return setError('Choose a client.');
    if (!name.trim()) return setError('Name is required.');
    if (!periodStart || !periodEnd) return setError('Both period dates are required.');
    if (periodEnd <= periodStart) return setError('Period end must be after period start.');
    setError(null);
    mutation.mutate();
  }

  return (
    <>
      <PageHeader title="New engagement" description="One engagement per client fiscal year." />
      <Card className="max-w-[560px]">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Client" htmlFor="e-client">
              <Select id="e-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Choose a client…</option>
                {clients?.items
                  .filter((c) => c.isActive)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Engagement name" htmlFor="e-name" hint='For example "FY2026 audit".'>
              <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Period start" htmlFor="e-start">
                <Input
                  id="e-start"
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </Field>
              <Field label="Period end" htmlFor="e-end">
                <Input
                  id="e-end"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </Field>
              <Field label="Currency (ISO 4217)" htmlFor="e-currency">
                <Input
                  id="e-currency"
                  value={currencyCode}
                  maxLength={3}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                />
              </Field>
              <Field
                label="Minor units per major"
                htmlFor="e-minor"
                hint="100 for USD/EUR, 1 for IDR."
              >
                <Input
                  id="e-minor"
                  type="number"
                  min={1}
                  value={minorUnitsPerMajor}
                  onChange={(e) => setMinorUnitsPerMajor(e.target.value)}
                />
              </Field>
            </div>
            {error && (
              <p className="rounded-control bg-danger-tint px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/engagements')}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create engagement'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
