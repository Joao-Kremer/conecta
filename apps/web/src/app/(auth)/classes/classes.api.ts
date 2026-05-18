import { z } from 'zod';

import { createCrudResource } from '@/lib/api/resource';

// Re-export the existing schools resource so the relation dropdown reuses it
// instead of duplicating the schema/client.
export { schoolsApi, type School } from '../schools/schools.api';

// A `school-modalities` web screen does not exist yet (only a `modalities`
// screen and the `school-modalities` backend module). The task forbids
// creating files outside this folder, so a minimal read client for the
// `/school-modalities` endpoint lives here purely to populate the relation
// dropdown. Mirrors apps/api/.../school-modality.entity.ts (read side only).
export const schoolModalitySchema = z
  .object({
    id: z.string(),
    schoolId: z.string(),
    modalityId: z.string(),
    active: z.boolean(),
  })
  .passthrough();

export const schoolModalityListSchema = z.array(schoolModalitySchema);

export type SchoolModality = z.infer<typeof schoolModalitySchema>;

// Read-only client (create/update unused here — the screen only lists them).
export const schoolModalitiesApi = createCrudResource<
  SchoolModality,
  Record<string, never>,
  Record<string, never>
>('/school-modalities', schoolModalitySchema, schoolModalityListSchema);

// Mirrors the serialized Class entity
// (apps/api/src/modules/classes/domain/entities/class.entity.ts).
// `.passthrough()` keeps unknown fields (organizationId, status, coach fields,
// monthlyFeeCents, timestamps) without forcing the screen to model them.
const scheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string(),
  end: z.string(),
});

export const classSchema = z
  .object({
    id: z.string(),
    schoolId: z.string(),
    schoolModalityId: z.string(),
    name: z.string(),
    ageGroup: z.string().nullable().optional(),
    schedule: z.array(scheduleSlotSchema),
    location: z.string().nullable().optional(),
    capacity: z.number().nullable().optional(),
  })
  .passthrough();

export const classListSchema = z.array(classSchema);

export type Class = z.infer<typeof classSchema>;

// Mirrors create-class.dto.ts on the backend EXACTLY.
const createScheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const createClassInput = z.object({
  schoolId: z.string().uuid(),
  schoolModalityId: z.string().uuid(),
  name: z.string().min(1).max(200),
  ageGroup: z.string().nullable().optional(),
  schedule: z.array(createScheduleSlotSchema),
  location: z.string().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  monthlyFeeCents: z.number().int().min(0).nullable().optional(),
});

// Mirrors update-class.dto.ts on the backend EXACTLY.
export const updateClassInput = z.object({
  name: z.string().min(1).max(200).optional(),
  ageGroup: z.string().nullable().optional(),
  schedule: z.array(createScheduleSlotSchema).optional(),
  location: z.string().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  monthlyFeeCents: z.number().int().min(0).nullable().optional(),
  status: z.string().optional(),
});

export type CreateClassInput = z.infer<typeof createClassInput>;
export type UpdateClassInput = z.infer<typeof updateClassInput>;

export const classesApi = createCrudResource<Class, CreateClassInput, UpdateClassInput>(
  '/classes',
  classSchema,
  classListSchema,
);
