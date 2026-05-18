import { z } from 'zod';

import { createCrudResource } from '@/lib/api/resource';

// Mirrors the serialized Guardian entity from the API
// (apps/api/src/modules/guardians/domain/entities/guardian.entity.ts).
// `.passthrough()` keeps unknown fields (createdAt/updatedAt/deletedAt/etc.)
// without forcing us to model every column here.
export const guardianSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    document: z.string().nullable(),
    phone: z.string(),
    email: z.string(),
    address: z.record(z.unknown()).nullable(),
    userId: z.string().nullable(),
  })
  .passthrough();

export const guardianListSchema = z.array(guardianSchema);

export type Guardian = z.infer<typeof guardianSchema>;

// Mirrors create-guardian.dto.ts on the backend EXACTLY.
export const createGuardianInput = z.object({
  fullName: z.string().min(1).max(200),
  document: z.string().nullable().optional(),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.record(z.unknown()).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
});

// Mirrors update-guardian.dto.ts on the backend EXACTLY.
export const updateGuardianInput = z.object({
  fullName: z.string().min(1).max(200).optional(),
  document: z.string().nullable().optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  address: z.record(z.unknown()).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
});

export type CreateGuardianInput = z.infer<typeof createGuardianInput>;
export type UpdateGuardianInput = z.infer<typeof updateGuardianInput>;

export const guardiansApi = createCrudResource<Guardian, CreateGuardianInput, UpdateGuardianInput>(
  '/guardians',
  guardianSchema,
  guardianListSchema,
);
