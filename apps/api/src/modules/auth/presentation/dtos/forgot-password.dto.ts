import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
