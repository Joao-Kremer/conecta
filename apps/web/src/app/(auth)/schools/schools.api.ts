import { z } from 'zod';

import { createCrudResource } from '@/lib/api/resource';

// Mirrors the serialized School entity from the API
// (apps/api/src/modules/schools/domain/entities/school.entity.ts).
// `.passthrough()` keeps unknown fields (createdAt/updatedAt/deletedAt/etc.)
// without forcing us to model every column here.
export const schoolSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    timezone: z.string(),
    status: z.string(),
  })
  .passthrough();

export const schoolListSchema = z.array(schoolSchema);

export type School = z.infer<typeof schoolSchema>;

// Mirrors create-school.dto.ts on the backend EXACTLY.
export const createSchoolInput = z.object({
  name: z.string().min(1).max(200),
  address: z.record(z.unknown()).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  timezone: z.string().optional(),
});

// Mirrors update-school.dto.ts on the backend EXACTLY.
export const updateSchoolInput = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.record(z.unknown()).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  timezone: z.string().optional(),
});

export type CreateSchoolInput = z.infer<typeof createSchoolInput>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolInput>;

export const schoolsApi = createCrudResource<School, CreateSchoolInput, UpdateSchoolInput>(
  '/schools',
  schoolSchema,
  schoolListSchema,
);
