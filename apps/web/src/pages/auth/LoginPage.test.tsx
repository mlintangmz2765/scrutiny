import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits credentials to the login endpoint', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'admin@scrutiny.local' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'admin-change-me-now' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    const body = (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).body as string;
    expect(JSON.parse(body)).toEqual({
      email: 'admin@scrutiny.local',
      password: 'admin-change-me-now',
    });
  });

  it('shows the API error message on failed login', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      }),
    } as Response);

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'x@y.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope-nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });
});
