import { z } from 'zod';

export const createModalitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export type CreateModalityDto = z.infer<typeof createModalitySchema>;
