import { z } from 'zod';

import { createCrudResource } from '@/lib/api/resource';

// Mirrors apps/api/src/modules/modalities/domain/entities/modality.entity.ts.
// `.passthrough()` keeps backend-only fields (organizationId, timestamps)
// without forcing the screen to model them.
export const modalitySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    active: z.boolean(),
  })
  .passthrough();

export const modalityListSchema = z.array(modalitySchema);

// Mirrors presentation/dtos/create-modality.dto.ts exactly.
export const createModalityInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

// Mirrors presentation/dtos/update-modality.dto.ts exactly.
export const updateModalityInput = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export type Modality = z.infer<typeof modalitySchema>;
export type CreateModalityInput = z.infer<typeof createModalityInput>;
export type UpdateModalityInput = z.infer<typeof updateModalityInput>;

export const modalitiesApi = createCrudResource<Modality, CreateModalityInput, UpdateModalityInput>(
  '/modalities',
  modalitySchema,
  modalityListSchema,
);
