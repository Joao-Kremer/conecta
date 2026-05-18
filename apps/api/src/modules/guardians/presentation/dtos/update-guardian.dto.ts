import { z } from 'zod';

export const updateGuardianSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    document: z.string().nullable().optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.record(z.unknown()).nullable().optional(),
    userId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type UpdateGuardianDto = z.infer<typeof updateGuardianSchema>;
