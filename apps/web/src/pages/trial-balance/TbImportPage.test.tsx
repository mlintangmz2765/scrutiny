import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TbImportPage } from './TbImportPage';

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

const previewWithErrors = {
  rows: [{ rowNumber: 2, accountCode: '2000', accountName: 'Payables', amount: -100 }],
  rowCount: 1,
  errors: [{ rowNumber: 1, code: 'UNPARSEABLE_AMOUNT', message: 'Amount is not a valid number.' }],
  totalDebit: 0,
  totalCredit: 100,
  total: -100,
  isBalanced: false,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route element={<Outlet context={{ engagement }} />}>
            <Route path="/" element={<TbImportPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function chooseCsvAndMapColumns() {
  const file = new File(['Code,Name,Debit,Credit\n1000,Cash,abc,\n2000,Payables,,1.00\n'], 'tb.csv', {
    type: 'text/csv',
  });
  fireEvent.change(screen.getByLabelText('File (CSV or XLSX)'), { target: { files: [file] } });

  // Wait for the async header sniff to populate the dropdown options.
  // Generous timeout: FileReader + state updates are slow under parallel CI load.
  await screen.findAllByRole('option', { name: 'Code' }, { timeout: 10_000 });
  fireEvent.change(screen.getByLabelText('Account code column'), { target: { value: 'Code' } });
  fireEvent.change(screen.getByLabelText('Account name column'), { target: { value: 'Name' } });
  fireEvent.change(screen.getByLabelText('Debit column'), { target: { value: 'Debit' } });
  fireEvent.change(screen.getByLabelText('Credit column'), { target: { value: 'Credit' } });
}

describe('TbImportPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/trial-balance/preview')) {
          return { ok: true, status: 200, json: async () => previewWithErrors };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ current: null, prior: null, unmappedAccountCount: 0 }),
        };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('blocks confirm when the preview has errors or is unbalanced', { timeout: 30_000 }, async () => {
    renderPage();
    await chooseCsvAndMapColumns();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText('Out of balance', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText(/Row 1: Amount is not a valid number/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm import/ })).toBeDisabled();
  });

  it('keeps Preview disabled until the column mapping is complete', { timeout: 30_000 }, async () => {
    renderPage();
    const file = new File(['Code,Name,Debit,Credit\n'], 'tb.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('File (CSV or XLSX)'), { target: { files: [file] } });

    const previewButton = await screen.findByRole('button', { name: 'Preview' }, { timeout: 10_000 });
    expect(previewButton).toBeDisabled();
  });
});
