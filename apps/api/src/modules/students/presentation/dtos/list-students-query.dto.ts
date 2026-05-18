import { z } from 'zod';

export const listStudentsQuerySchema = z
  .object({
    search: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict();

export type ListStudentsQueryDto = z.infer<typeof listStudentsQuerySchema>;
