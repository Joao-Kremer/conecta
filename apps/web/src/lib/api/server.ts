import { cookies } from 'next/headers';
import type { ZodSchema } from 'zod';

import { ApiError } from './errors';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

// Server-side fetch for React Server Components. Forwards the auth cookies and
// validates the response with Zod, mirroring the client `apiClient` contract.
export async function apiServerGet<T>(path: string, schema: ZodSchema<T>): Promise<T> {
  const cookieStore = await cookies();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { cookie: cookieStore.toString(), 'x-requested-with': 'conecta-web' },
    cache: 'no-store',
  });

  if (!res.ok) throw await ApiError.from(res);

  const json = (await res.json()) as unknown;
  return schema.parse(json);
}
