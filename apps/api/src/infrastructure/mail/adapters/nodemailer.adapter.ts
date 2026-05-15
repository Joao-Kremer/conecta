import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import * as nodemailer from 'nodemailer';
import React from 'react';

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
export class NodemailerAdapter implements IEmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly webUrl: string;
  private readonly logger = new Logger(NodemailerAdapter.name);

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    this.webUrl = config.get('WEB_URL', { infer: true });
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
    });
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
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: 'Confirme seu email',
      html,
    });
    this.logger.log(`Verification email sent to ${payload.to}`);
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
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: 'Redefinição de senha',
      html,
    });
    this.logger.log(`Password reset email sent to ${payload.to}`);
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
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: `Convite para ${payload.organizationName}`,
      html,
    });
    this.logger.log(`Invite email sent to ${payload.to}`);
  }

  async sendWelcome(payload: WelcomeEmailPayload): Promise<void> {
    const loginUrl = `${this.webUrl}/login`;
    const html = await render(
      React.createElement(WelcomeTemplate, {
        name: payload.name,
        loginUrl,
      }),
    );
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: 'Bem-vindo ao Conecta!',
      html,
    });
    this.logger.log(`Welcome email sent to ${payload.to}`);
  }
}
