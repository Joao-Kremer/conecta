import { z } from 'zod';

export const createInviteSchema = z
  .object({
    email: z.string().email(),
    roleKey: z.enum(['ADMIN', 'ORG_STAFF', 'SCHOOL_STAFF', 'COACH', 'GUARDIAN']),
    schoolIds: z.array(z.string().uuid()).nullable().optional(),
  })
  .strict();

export type CreateInviteDto = z.infer<typeof createInviteSchema>;
