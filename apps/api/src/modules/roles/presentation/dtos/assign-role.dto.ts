import { z } from 'zod';

export const assignRoleSchema = z
  .object({
    targetUserId: z.string().uuid(),
    roleKey: z.string().min(1),
  })
  .strict();

export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
