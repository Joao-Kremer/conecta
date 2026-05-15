import { z } from 'zod';

export const signupOrganizationSchema = z.object({
  organizationName: z.string().min(2).max(120),
  adminName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  acceptTerms: z.literal(true),
});

export type SignupOrganizationDto = z.infer<typeof signupOrganizationSchema>;
