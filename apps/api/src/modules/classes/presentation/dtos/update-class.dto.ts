import { z } from 'zod';

const scheduleSlotSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const updateClassSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    ageGroup: z.string().nullable().optional(),
    schedule: z.array(scheduleSlotSchema).optional(),
    location: z.string().nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    monthlyFeeCents: z.number().int().min(0).nullable().optional(),
    status: z.string().optional(),
  })
  .strict();

export type UpdateClassDto = z.infer<typeof updateClassSchema>;
