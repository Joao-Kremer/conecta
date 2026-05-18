import { z } from 'zod';

export const updateStudentGuardianSchema = z
  .object({
    relationship: z.enum(['FATHER', 'MOTHER', 'GRANDPARENT', 'OTHER']).optional(),
    isPrimaryPayer: z.boolean().optional(),
    receivesCommunications: z.boolean().optional(),
    isEmergencyContact: z.boolean().optional(),
  })
  .strict();

export type UpdateStudentGuardianDto = z.infer<typeof updateStudentGuardianSchema>;
