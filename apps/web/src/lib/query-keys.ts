// Stable TanStack Query key factories. One factory per CRUD resource keeps
// keys consistent for cache reads and mutation invalidation.
// See docs/06-FRONTEND_GUIDE.md "TanStack Query conventions".
export function crudKeys(resource: string) {
  return {
    all: [resource] as const,
    list: (params?: Record<string, unknown>) =>
      [resource, 'list', params ?? {}] as const,
    detail: (id: string) => [resource, 'detail', id] as const,
  };
}

export const schoolKeys = crudKeys('schools');
export const modalityKeys = crudKeys('modalities');
export const schoolModalityKeys = crudKeys('school-modalities');
export const classKeys = crudKeys('classes');
export const studentKeys = crudKeys('students');
export const guardianKeys = crudKeys('guardians');
