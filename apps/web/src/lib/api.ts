/** Error envelope thrown for every non-2xx API response (ARCHITECTURE.md §4). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

/** Typed fetch wrapper: prefixes /api, sends cookies, unwraps the error envelope. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(headers as Record<string, string>) },
  });

  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as ErrorEnvelope;
      if (body.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
