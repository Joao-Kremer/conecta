import { z } from 'zod';

export const updateSchoolSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    address: z.record(z.unknown()).nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    timezone: z.string().optional(),
  })
  .strict();

export type UpdateSchoolDto = z.infer<typeof updateSchoolSchema>;
