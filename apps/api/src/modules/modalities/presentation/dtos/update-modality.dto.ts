import { z } from 'zod';

export const updateModalitySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

export type UpdateModalityDto = z.infer<typeof updateModalitySchema>;
