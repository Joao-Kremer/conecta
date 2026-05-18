import { z } from 'zod';

export const createGuardianSchema = z
  .object({
    fullName: z.string().min(1).max(200),
    document: z.string().nullable().optional(),
    phone: z.string().min(1),
    email: z.string().email(),
    address: z.record(z.unknown()).nullable().optional(),
    userId: z.string().uuid().nullable().optional(),
  })
  .strict();

export type CreateGuardianDto = z.infer<typeof createGuardianSchema>;
