import { z } from 'zod';

const scheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const createClassSchema = z
  .object({
    schoolId: z.string().uuid(),
    schoolModalityId: z.string().uuid(),
    name: z.string().min(1).max(200),
    ageGroup: z.string().nullable().optional(),
    schedule: z.array(scheduleSlotSchema),
    location: z.string().nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    monthlyFeeCents: z.number().int().min(0).nullable().optional(),
  })
  .strict();

export type CreateClassDto = z.infer<typeof createClassSchema>;
