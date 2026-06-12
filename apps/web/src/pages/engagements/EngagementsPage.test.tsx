import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserPublic } from '@scrutiny/shared';
import { AuthProvider } from '../../lib/auth';
import { EngagementCreatePage } from './EngagementCreatePage';
import { EngagementsPage } from './EngagementsPage';

const manager: UserPublic = {
  id: 'u1',
  email: 'manager@test.local',
  name: 'Manager',
  role: 'MANAGER',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const engagement = {
  id: 'e1',
  clientId: 'c1',
  clientName: 'Aurora Manufacturing Ltd',
  name: 'FY2026 audit',
  periodStart: '2026-01-01',
  periodEnd: '2026-12-31',
  currencyCode: 'IDR',
  minorUnitsPerMajor: 1,
  status: 'PLANNING',
  memberCount: 2,
  createdAt: '',
  updatedAt: '',
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider user={manager}>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('EngagementsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/engagements')) {
          return { ok: true, status: 200, json: async () => ({ items: [engagement], total: 1 }) };
        }
        return { ok: true, status: 200, json: async () => ({ items: [], total: 0 }) };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders engagement rows with client and status', async () => {
    renderWithProviders(<EngagementsPage />);
    expect(await screen.findByText('FY2026 audit')).toBeInTheDocument();
    expect(screen.getByText('Aurora Manufacturing Ltd')).toBeInTheDocument();
    // "Planning" appears in the status filter option and in the row's chip.
    expect(screen.getAllByText('Planning').length).toBeGreaterThanOrEqual(2);
  });
});

describe('EngagementCreatePage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0 }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('blocks creation when the period is backwards', async () => {
    renderWithProviders(<EngagementCreatePage />);
    fireEvent.change(await screen.findByLabelText('Client'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Engagement name'), {
      target: { value: 'FY2026 audit' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create engagement' }));
    expect(await screen.findByText('Choose a client.')).toBeInTheDocument();

    await waitFor(() => {
      const postCalls = vi
        .mocked(fetch)
        .mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
      expect(postCalls).toHaveLength(0);
    });
  });
});
