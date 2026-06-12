import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserPublic } from '@scrutiny/shared';
import { AuthProvider } from '../../lib/auth';
import { ClientsPage } from './ClientsPage';

const manager: UserPublic = {
  id: 'u1',
  email: 'manager@test.local',
  name: 'Manager',
  role: 'MANAGER',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const clients = [
  {
    id: 'c1',
    name: 'Aurora Manufacturing Ltd',
    registrationNumber: null,
    industry: 'Manufacturing',
    contactName: 'Jane Smith',
    contactEmail: null,
    notes: null,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'c2',
    name: 'Borneo Retail Group',
    registrationNumber: null,
    industry: null,
    contactName: null,
    contactEmail: null,
    notes: null,
    isActive: false,
    createdAt: '',
    updatedAt: '',
  },
];

function renderPage(user: UserPublic = manager) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider user={user}>
        <ClientsPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: clients, total: clients.length }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders client rows from the API', async () => {
    renderPage();
    expect(await screen.findByText('Aurora Manufacturing Ltd')).toBeInTheDocument();
    expect(screen.getByText('Borneo Retail Group')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('hides the create action from STAFF', async () => {
    renderPage({ ...manager, role: 'STAFF' });
    await screen.findByText('Aurora Manufacturing Ltd');
    expect(screen.queryByRole('button', { name: 'New client' })).not.toBeInTheDocument();
  });

  it('blocks saving a client without a name', async () => {
    renderPage();
    await screen.findByText('Aurora Manufacturing Ltd');
    fireEvent.click(screen.getByRole('button', { name: 'New client' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save client' }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    await waitFor(() => {
      const postCalls = vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
      expect(postCalls).toHaveLength(0);
    });
  });
});
