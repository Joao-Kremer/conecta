import { z } from 'zod';

import { apiClient } from '@/lib/api/client';
import { createCrudResource } from '@/lib/api/resource';

// Mirrors the serialized Student entity from the API
// (apps/api/src/modules/students/domain/entities/student.entity.ts).
// Encrypted columns are decrypted server-side, so the wire shape is plaintext.
// `.passthrough()` keeps unknown fields (createdAt/updatedAt/deletedAt/
// organizationId/fullNameSearch/anonymizedAt/etc.) without modeling them here.
const emergencyContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  relationship: z.string(),
});

export const studentSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    birthDate: z.string(),
    document: z.string().nullable().optional(),
    photoUrl: z.string().nullable().optional(),
    medicalNotes: z.string().nullable().optional(),
    allergies: z.string().nullable().optional(),
    medications: z.string().nullable().optional(),
    uniformSize: z.enum(['PP', 'P', 'M', 'G', 'GG', 'XG']).nullable().optional(),
    emergencyContact: emergencyContactSchema.nullable().optional(),
    status: z.string(),
  })
  .passthrough();

export const studentListSchema = z.array(studentSchema);

export type Student = z.infer<typeof studentSchema>;

// Mirrors create-student.dto.ts on the backend EXACTLY.
export const createStudentInput = z.object({
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
});

// Mirrors update-student.dto.ts on the backend EXACTLY.
export const updateStudentInput = z.object({
  fullName: z.string().min(1).max(200).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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
});

export type CreateStudentInput = z.infer<typeof createStudentInput>;
export type UpdateStudentInput = z.infer<typeof updateStudentInput>;

export const studentsApi = createCrudResource<
  Student,
  CreateStudentInput,
  UpdateStudentInput
>('/students', studentSchema, studentListSchema);

// --- Student <-> Guardian links -------------------------------------------
// Mirrors apps/api/src/modules/student-guardians/presentation
// (create/update-student-guardian.dto.ts + controller routes).
export const guardianRelationship = z.enum([
  'FATHER',
  'MOTHER',
  'GRANDPARENT',
  'OTHER',
]);
export type GuardianRelationship = z.infer<typeof guardianRelationship>;

// The link row is returned by the use case; the exact projection (whether the
// guardian is embedded) isn't part of the studied DTOs, so `.passthrough()`
// keeps any extra fields (e.g. an embedded guardian object) usable downstream.
export const studentGuardianSchema = z
  .object({
    id: z.string(),
    studentId: z.string(),
    guardianId: z.string(),
    relationship: guardianRelationship,
    isPrimaryPayer: z.boolean().optional(),
    receivesCommunications: z.boolean().optional(),
    isEmergencyContact: z.boolean().optional(),
  })
  .passthrough();

export const studentGuardianListSchema = z.array(studentGuardianSchema);

export type StudentGuardian = z.infer<typeof studentGuardianSchema>;

export const linkGuardianInput = z.object({
  studentId: z.string().uuid(),
  guardianId: z.string().uuid(),
  relationship: guardianRelationship,
  isPrimaryPayer: z.boolean().optional(),
  receivesCommunications: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
});

export const updateGuardianLinkInput = z.object({
  relationship: guardianRelationship.optional(),
  isPrimaryPayer: z.boolean().optional(),
  receivesCommunications: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
});

export type LinkGuardianInput = z.infer<typeof linkGuardianInput>;
export type UpdateGuardianLinkInput = z.infer<typeof updateGuardianLinkInput>;

const noBody = z.unknown();

export const studentGuardiansApi = {
  listByStudent: (studentId: string): Promise<StudentGuardian[]> =>
    apiClient.get(
      `/student-guardians/student/${studentId}`,
      studentGuardianListSchema,
    ),
  link: (body: LinkGuardianInput): Promise<StudentGuardian> =>
    apiClient.post('/student-guardians', body, studentGuardianSchema),
  update: (
    id: string,
    body: UpdateGuardianLinkInput,
  ): Promise<StudentGuardian> =>
    apiClient.patch(`/student-guardians/${id}`, body, studentGuardianSchema),
  unlink: (id: string): Promise<unknown> =>
    apiClient.delete(`/student-guardians/${id}`, noBody),
};

// TODO: dedupe with guardians.api once both land. The guardians screen is being
// built in parallel; its `../guardians/guardians.api` isn't available yet, so we
// define a minimal inline list client here for the guardian picker.
const guardianOptionSchema = z
  .object({
    id: z.string(),
    fullName: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export const guardianListSchema = z.array(guardianOptionSchema);

export type GuardianOption = z.infer<typeof guardianOptionSchema>;

export const guardiansListApi = {
  list: (): Promise<GuardianOption[]> =>
    apiClient.get('/guardians', guardianListSchema),
};
