import type { ErrorEnvelope } from '@oj/contracts';

// access token lives in memory only; the refresh token is an httponly cookie.
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
}

async function raw<T>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const json = (await res.json().catch(() => null)) as T | ErrorEnvelope | null;
  if (!res.ok) {
    const e = (json as ErrorEnvelope | null)?.error;
    throw new ApiError(res.status, e?.code ?? 'INTERNAL', e?.message ?? res.statusText, e?.details);
  }
  return json as T;
}

/** one silent refresh on 401, then give up and let the caller show the login page. */
export async function api<T>(method: string, path: string, body?: unknown, extra?: Record<string, string>): Promise<T> {
  try {
    return await raw<T>(method, path, body, extra);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !path.startsWith('/api/auth/')) {
      const ok = await refresh();
      if (ok) return raw<T>(method, path, body, extra);
    }
    throw e;
  }
}

export async function refresh(): Promise<boolean> {
  try {
    const r = await raw<{ accessToken: string }>('POST', '/api/auth/refresh');
    setAccessToken(r.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}
