import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MappingPage } from './MappingPage';

const engagement = {
  id: 'e1',
  clientId: 'c1',
  clientName: 'Aurora Manufacturing Ltd',
  name: 'FY2026 audit',
  periodStart: '2026-01-01',
  periodEnd: '2026-12-31',
  currencyCode: 'USD',
  minorUnitsPerMajor: 100,
  status: 'PLANNING',
  memberCount: 1,
  createdAt: '',
  updatedAt: '',
};

const fsliGroups = [
  { id: 'g-a1', code: 'A.1', name: 'Cash and cash equivalents', statement: 'BS', normalSign: 'DR', sortOrder: 0 },
  { id: 'g-r1', code: 'R.1', name: 'Revenue', statement: 'IS', normalSign: 'CR', sortOrder: 17 },
];

const mappingRows = [
  {
    accountId: 'a-cash',
    accountCode: '1000',
    accountName: 'Cash on hand',
    currentAmount: 150000,
    fsliGroupId: null,
    suggestedFsliCode: 'A.1',
  },
  {
    accountId: 'a-rev',
    accountCode: '4000',
    accountName: 'Revenue',
    currentAmount: -150000,
    fsliGroupId: null,
    suggestedFsliCode: 'R.1',
  },
];

let fetchMock: ReturnType<typeof vi.fn>;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route element={<Outlet context={{ engagement }} />}>
            <Route path="/" element={<MappingPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MappingPage', () => {
  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/fsli-groups')) {
        return { ok: true, status: 200, json: async () => ({ items: fsliGroups }) };
      }
      if (url.includes('/mappings') && init?.method === 'PUT') {
        return { ok: true, status: 200, json: async () => ({ saved: 2 }) };
      }
      if (url.includes('/mappings')) {
        return { ok: true, status: 200, json: async () => ({ items: mappingRows }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it(
    'apply-all fills the dropdowns from suggestions and save sends one bulk PUT',
    { timeout: 30_000 },
    async () => {
      renderPage();

      const cashSelect = (await screen.findByLabelText(
        'FSLI group for 1000',
        {},
        { timeout: 10_000 },
      )) as HTMLSelectElement;
      const revenueSelect = screen.getByLabelText('FSLI group for 4000') as HTMLSelectElement;
      expect(cashSelect.value).toBe('');
      expect(screen.getByText('2 unmapped')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Apply all suggestions' }));
      expect(cashSelect.value).toBe('g-a1');
      expect(revenueSelect.value).toBe('g-r1');
      expect(screen.getByText('All mapped')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Save mappings' }));
      await waitFor(
        () => {
          const putCalls = fetchMock.mock.calls.filter(
            ([, init]) => (init as RequestInit | undefined)?.method === 'PUT',
          );
          expect(putCalls).toHaveLength(1);
          const body = JSON.parse(String((putCalls[0]![1] as RequestInit).body));
          expect(body).toEqual([
            { accountId: 'a-cash', fsliGroupId: 'g-a1' },
            { accountId: 'a-rev', fsliGroupId: 'g-r1' },
          ]);
        },
        { timeout: 10_000 },
      );
    },
  );

  it('filters to unmapped rows only', { timeout: 30_000 }, async () => {
    renderPage();
    await screen.findByLabelText('FSLI group for 1000', {}, { timeout: 10_000 });

    fireEvent.click(screen.getByRole('button', { name: 'Apply all suggestions' }));
    fireEvent.click(screen.getByLabelText('Unmapped only'));
    expect(screen.queryByText('Cash on hand')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
  });
});
