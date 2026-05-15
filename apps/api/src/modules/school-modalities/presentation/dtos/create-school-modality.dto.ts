import { z } from 'zod';

export const createSchoolModalitySchema = z
  .object({
    schoolId: z.string().uuid(),
    modalityId: z.string().uuid(),
    defaultMonthlyFeeCents: z.number().int().min(0),
    defaultEnrollmentFeeCents: z.number().int().min(0).default(0),
  })
  .strict();

export type CreateSchoolModalityDto = z.infer<typeof createSchoolModalitySchema>;
