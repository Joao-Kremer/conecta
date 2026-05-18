import { z } from 'zod';

const consentPurpose = z.enum(['data_processing', 'photo_use', 'communications', 'marketing']);

export const recordConsentSchema = z
  .object({
    guardianId: z.string().uuid(),
    studentId: z.string().uuid().nullable().optional(),
    termsVersion: z.string().min(1),
    grantedFor: z.array(consentPurpose).min(1),
  })
  .strict();

export const revokeConsentSchema = z
  .object({
    guardianId: z.string().uuid(),
    studentId: z.string().uuid().nullable().optional(),
    termsVersion: z.string().min(1).optional(),
    purposes: z.array(consentPurpose).min(1),
  })
  .strict();

export type RecordConsentDto = z.infer<typeof recordConsentSchema>;
export type RevokeConsentDto = z.infer<typeof revokeConsentSchema>;
