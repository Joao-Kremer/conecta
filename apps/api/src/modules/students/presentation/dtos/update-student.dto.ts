import { z } from 'zod';

export const updateStudentSchema = z
  .object({
    fullName: z.string().min(1).max(200).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    document: z.string().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    medicalNotes: z.string().nullable().optional(),
    allergies: z.string().nullable().optional(),
    medications: z.string().nullable().optional(),
    uniformSize: z.enum(['PP', 'P', 'M', 'G', 'GG', 'XG']).optional().nullable(),
    emergencyContact: z
      .object({
        name: z.string(),
        phone: z.string(),
        relationship: z.string(),
      })
      .nullable()
      .optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict();

export type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
