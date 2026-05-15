import { Injectable, Logger } from '@nestjs/common';

import {
  type IEmailSender,
  type InviteEmailPayload,
  type PasswordResetEmailPayload,
  type VerificationEmailPayload,
  type WelcomeEmailPayload,
} from '../../application/ports/email-sender.port';

@Injectable()
export class NoopEmailSender implements IEmailSender {
  private readonly logger = new Logger(NoopEmailSender.name);

  async sendVerification(payload: VerificationEmailPayload): Promise<void> {
    this.logger.log(`[NOOP] Verification email → ${payload.to}, token: ${payload.token}`);
  }

  async sendPasswordReset(payload: PasswordResetEmailPayload): Promise<void> {
    this.logger.log(`[NOOP] Password reset email → ${payload.to}, token: ${payload.token}`);
  }

  async sendInvite(payload: InviteEmailPayload): Promise<void> {
    this.logger.log(`[NOOP] Invite email → ${payload.to}, token: ${payload.token}`);
  }

  async sendWelcome(payload: WelcomeEmailPayload): Promise<void> {
    this.logger.log(`[NOOP] Welcome email → ${payload.to}`);
  }
}
