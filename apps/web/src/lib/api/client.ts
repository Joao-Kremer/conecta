import type { ZodSchema } from 'zod';

import { ApiError, UnauthorizedError } from './errors';

function defaultHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
  h.set('X-Requested-With', 'conecta-web');
  return h;
}

async function request<T>(
  path: string,
  init: RequestInit & { skipRefresh?: boolean },
  schema: ZodSchema<T>,
): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, headers: defaultHeaders(init.headers) });

  if (res.status === 401 && !init.skipRefresh) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST' });
    if (refreshed.ok) return request(path, { ...init, skipRefresh: true }, schema);
    throw new UnauthorizedError();
  }

  if (!res.ok) throw await ApiError.from(res);

  const json = (await res.json()) as unknown;
  return schema.parse(json);
}

export const apiClient = {
  get: <T>(path: string, schema: ZodSchema<T>) => request(path, { method: 'GET' }, schema),
  post: <T>(path: string, body: unknown, schema: ZodSchema<T>) =>
    request(path, { method: 'POST', body: JSON.stringify(body) }, schema),
  patch: <T>(path: string, body: unknown, schema: ZodSchema<T>) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body) }, schema),
  delete: <T>(path: string, schema: ZodSchema<T>) => request(path, { method: 'DELETE' }, schema),
};
