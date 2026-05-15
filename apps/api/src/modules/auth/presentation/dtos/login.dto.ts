import { z } from 'zod';

export const loginSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

export type LoginDto = z.infer<typeof loginSchema>;
