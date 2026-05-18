import { type ZodSchema, z } from 'zod';

import { apiClient } from './client';

// DELETE returns 204/no body — accept anything.
const noBodySchema = z.unknown();

// Builds a typed CRUD client for a REST resource over the generic apiClient.
// Each screen supplies the resource's Zod schemas (kept next to the screen so
// they stay in sync with the backend DTOs).
export function createCrudResource<TEntity, TCreate, TUpdate>(
  basePath: string,
  entitySchema: ZodSchema<TEntity>,
  listSchema: ZodSchema<TEntity[]>,
) {
  return {
    list: (query?: Record<string, string | undefined>): Promise<TEntity[]> => {
      const entries = Object.entries(query ?? {}).filter(
        ([, v]) => v != null,
      ) as [string, string][];
      const qs = entries.length > 0 ? `?${new URLSearchParams(entries).toString()}` : '';
      return apiClient.get(`${basePath}${qs}`, listSchema);
    },
    get: (id: string): Promise<TEntity> => apiClient.get(`${basePath}/${id}`, entitySchema),
    create: (body: TCreate): Promise<TEntity> => apiClient.post(`${basePath}`, body, entitySchema),
    update: (id: string, body: TUpdate): Promise<TEntity> =>
      apiClient.patch(`${basePath}/${id}`, body, entitySchema),
    remove: (id: string): Promise<unknown> => apiClient.delete(`${basePath}/${id}`, noBodySchema),
  };
}
