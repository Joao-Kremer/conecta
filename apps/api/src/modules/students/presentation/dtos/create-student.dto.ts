import { z } from 'zod';

export const createStudentSchema = z
  .object({
    fullName: z.string().min(1).max(200),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export type CreateStudentDto = z.infer<typeof createStudentSchema>;
