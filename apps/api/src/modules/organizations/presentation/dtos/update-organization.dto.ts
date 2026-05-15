import { z } from 'zod';

export const updateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    logoUrl: z.string().url().nullable().optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .strict();

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
