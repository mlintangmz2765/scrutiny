import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import type { ClientRecord } from '@scrutiny/shared';
import { Button, Dialog, Field, Input, Textarea } from '../../components/ui';
import { ApiError, apiFetch } from '../../lib/api';

export interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, the dialog edits this client; otherwise it creates one. */
  client: ClientRecord | null;
}

interface FormState {
  name: string;
  registrationNumber: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  notes: string;
}

const emptyForm: FormState = {
  name: '',
  registrationNumber: '',
  industry: '',
  contactName: '',
  contactEmail: '',
  notes: '',
};

function formFromClient(client: ClientRecord | null): FormState {
  if (!client) return emptyForm;
  return {
    name: client.name,
    registrationNumber: client.registrationNumber ?? '',
    industry: client.industry ?? '',
    contactName: client.contactName ?? '',
    contactEmail: client.contactEmail ?? '',
    notes: client.notes ?? '',
  };
}

export function ClientFormDialog({ open, onClose, client }: ClientFormDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(formFromClient(client));
      setError(null);
    }
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: async (body: FormState) => {
      const payload: Record<string, string> = { name: body.name.trim() };
      for (const key of ['registrationNumber', 'industry', 'contactName', 'contactEmail', 'notes'] as const) {
        if (body[key].trim()) payload[key] = body[key].trim();
      }
      return client
        ? apiFetch(`/clients/${client.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : apiFetch('/clients', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save the client.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    mutation.mutate(form);
  }

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={client ? 'Edit client' : 'New client'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save client'}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" htmlFor="c-name" error={error ?? undefined}>
          <Input id="c-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration no." htmlFor="c-reg">
            <Input
              id="c-reg"
              value={form.registrationNumber}
              onChange={(e) => set('registrationNumber', e.target.value)}
            />
          </Field>
          <Field label="Industry" htmlFor="c-industry">
            <Input
              id="c-industry"
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
            />
          </Field>
          <Field label="Contact name" htmlFor="c-contact">
            <Input
              id="c-contact"
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
            />
          </Field>
          <Field label="Contact email" htmlFor="c-email">
            <Input
              id="c-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes" htmlFor="c-notes">
          <Textarea id="c-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
