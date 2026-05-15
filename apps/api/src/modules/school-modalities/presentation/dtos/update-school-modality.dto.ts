import { z } from 'zod';

export const updateSchoolModalitySchema = z
  .object({
    defaultMonthlyFeeCents: z.number().int().min(0).optional(),
    defaultEnrollmentFeeCents: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export type UpdateSchoolModalityDto = z.infer<typeof updateSchoolModalitySchema>;
