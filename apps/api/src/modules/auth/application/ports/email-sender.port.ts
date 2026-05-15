export interface VerificationEmailPayload {
  to: string;
  name: string;
  token: string;
  expiresInHours: number;
}

export interface PasswordResetEmailPayload {
  to: string;
  name: string;
  token: string;
  expiresInMinutes: number;
}

export interface InviteEmailPayload {
  to: string;
  inviterName: string;
  organizationName: string;
  token: string;
  role: string;
  expiresInHours: number;
}

export abstract class IEmailSender {
  abstract sendVerification(payload: VerificationEmailPayload): Promise<void>;
  abstract sendPasswordReset(payload: PasswordResetEmailPayload): Promise<void>;
  abstract sendInvite(payload: InviteEmailPayload): Promise<void>;
}
