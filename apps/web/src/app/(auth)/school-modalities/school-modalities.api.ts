import { z } from 'zod';

import { createCrudResource } from '@/lib/api/resource';

// Read-only relation clients reused for the school/modality dropdowns.
// Do NOT duplicate — these already mirror their own backend DTOs.
export { schoolsApi } from '../schools/schools.api';
export { modalitiesApi } from '../modalities/modalities.api';

// Mirrors apps/api/src/modules/school-modalities/domain/entities/
// school-modality.entity.ts. `.passthrough()` keeps backend-only fields
// (organizationId, timestamps) without forcing the screen to model them.
export const schoolModalitySchema = z
  .object({
    id: z.string(),
    schoolId: z.string(),
    modalityId: z.string(),
    defaultMonthlyFeeCents: z.number(),
    defaultEnrollmentFeeCents: z.number(),
    active: z.boolean(),
  })
  .passthrough();

export const schoolModalityListSchema = z.array(schoolModalitySchema);

// Mirrors presentation/dtos/create-school-modality.dto.ts EXACTLY.
export const createSchoolModalityInput = z.object({
  schoolId: z.string().uuid(),
  modalityId: z.string().uuid(),
  defaultMonthlyFeeCents: z.number().int().min(0),
  defaultEnrollmentFeeCents: z.number().int().min(0).default(0),
});

// Mirrors presentation/dtos/update-school-modality.dto.ts EXACTLY.
export const updateSchoolModalityInput = z.object({
  defaultMonthlyFeeCents: z.number().int().min(0).optional(),
  defaultEnrollmentFeeCents: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export type SchoolModality = z.infer<typeof schoolModalitySchema>;
export type CreateSchoolModalityInput = z.infer<typeof createSchoolModalityInput>;
export type UpdateSchoolModalityInput = z.infer<typeof updateSchoolModalityInput>;

export const schoolModalitiesApi = createCrudResource<
  SchoolModality,
  CreateSchoolModalityInput,
  UpdateSchoolModalityInput
>('/school-modalities', schoolModalitySchema, schoolModalityListSchema);
