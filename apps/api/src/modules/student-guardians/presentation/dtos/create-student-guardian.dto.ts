import { z } from 'zod';

export const createStudentGuardianSchema = z
  .object({
    studentId: z.string().uuid(),
    guardianId: z.string().uuid(),
    relationship: z.enum(['FATHER', 'MOTHER', 'GRANDPARENT', 'OTHER']),
    isPrimaryPayer: z.boolean().optional(),
    receivesCommunications: z.boolean().optional(),
    isEmergencyContact: z.boolean().optional(),
  })
  .strict();

export type CreateStudentGuardianDto = z.infer<typeof createStudentGuardianSchema>;
