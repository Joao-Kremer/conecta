import { z } from 'zod';

export const assignCoachSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export type AssignCoachDto = z.infer<typeof assignCoachSchema>;
