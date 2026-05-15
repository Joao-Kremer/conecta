import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import React from 'react';
import { Resend } from 'resend';

import {
  type IEmailSender,
  type InviteEmailPayload,
  type PasswordResetEmailPayload,
  type VerificationEmailPayload,
  type WelcomeEmailPayload,
} from '../../../modules/auth/application/ports/email-sender.port';
import { type Env } from '../../config/env.schema';
import { InviteTemplate } from '../templates/invite.template';
import { PasswordResetTemplate } from '../templates/password-reset.template';
import { VerifyEmailTemplate } from '../templates/verify-email.template';
import { WelcomeTemplate } from '../templates/welcome.template';

@Injectable()
export class ResendAdapter implements IEmailSender {
  private readonly client: Resend;
  private readonly from: string;
  private readonly webUrl: string;
  private readonly logger = new Logger(ResendAdapter.name);

  constructor(config: ConfigService<Env, true>) {
    this.client = new Resend(config.get('RESEND_API_KEY', { infer: true }));
    this.from = config.get('MAIL_FROM', { infer: true });
    this.webUrl = config.get('WEB_URL', { infer: true });
  }

  async sendVerification(payload: VerificationEmailPayload): Promise<void> {
    const verifyUrl = `${this.webUrl}/verify-email?token=${payload.token}`;
    const html = await render(
      React.createElement(VerifyEmailTemplate, {
        name: payload.name,
        verifyUrl,
        expiresInHours: payload.expiresInHours,
      }),
    );
    const { error } = await this.client.emails.send({
      from: this.from,
      to: payload.to,
      subject: 'Confirme seu email',
      html,
    });
    if (error) {
      this.logger.error(`Failed to send verification email to ${payload.to}: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  async sendPasswordReset(payload: PasswordResetEmailPayload): Promise<void> {
    const resetUrl = `${this.webUrl}/reset-password?token=${payload.token}`;
    const html = await render(
      React.createElement(PasswordResetTemplate, {
        name: payload.name,
        resetUrl,
        expiresInMinutes: payload.expiresInMinutes,
      }),
    );
    const { error } = await this.client.emails.send({
      from: this.from,
      to: payload.to,
      subject: 'Redefinição de senha',
      html,
    });
    if (error) {
      this.logger.error(`Failed to send password reset email to ${payload.to}: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  async sendInvite(payload: InviteEmailPayload): Promise<void> {
    const acceptUrl = `${this.webUrl}/accept-invite?token=${payload.token}`;
    const html = await render(
      React.createElement(InviteTemplate, {
        inviterName: payload.inviterName,
        organizationName: payload.organizationName,
        acceptUrl,
        role: payload.role,
        expiresInHours: payload.expiresInHours,
      }),
    );
    const { error } = await this.client.emails.send({
      from: this.from,
      to: payload.to,
      subject: `Convite para ${payload.organizationName}`,
      html,
    });
    if (error) {
      this.logger.error(`Failed to send invite email to ${payload.to}: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  async sendWelcome(payload: WelcomeEmailPayload): Promise<void> {
    const loginUrl = `${this.webUrl}/login`;
    const html = await render(
      React.createElement(WelcomeTemplate, {
        name: payload.name,
        loginUrl,
      }),
    );
    const { error } = await this.client.emails.send({
      from: this.from,
      to: payload.to,
      subject: 'Bem-vindo ao Conecta!',
      html,
    });
    if (error) {
      this.logger.error(`Failed to send welcome email to ${payload.to}: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }
}
