import { z } from 'zod';

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(120),
  password: z.string().min(10).max(128),
});

export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;
