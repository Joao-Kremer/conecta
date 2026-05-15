import { z } from 'zod';

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .strict();

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
