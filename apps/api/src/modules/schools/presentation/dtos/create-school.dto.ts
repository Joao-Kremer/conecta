import { z } from 'zod';

export const createSchoolSchema = z
  .object({
    name: z.string().min(1).max(200),
    address: z.record(z.unknown()).nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    timezone: z.string().optional().default('America/Sao_Paulo'),
  })
  .strict();

export type CreateSchoolDto = z.infer<typeof createSchoolSchema>;
