import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const me = {
  id: 'u1',
  email: 'admin@scrutiny.local',
  name: 'Administrator',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date().toISOString(),
};

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/auth/me')) return jsonResponse(me);
        if (url.includes('/api/health')) return jsonResponse({ status: 'ok' });
        return { ok: false, status: 404, json: async () => ({ error: { code: 'NOT_FOUND' } }) };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the shell and dashboard for an authenticated user', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Scrutiny')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(await screen.findByText('API: ok')).toBeInTheDocument();
  });
});
