import { Injectable } from '@nestjs/common';

import { IEmailSender } from '../ports/email-sender.port';
import { IUserRepository } from '../ports/user.repository.port';
import { generateToken, hashToken } from '../utils/token.utils';

export interface ForgotPasswordInput {
  organizationId: string;
  email: string;
}

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailSender: IEmailSender,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    const user = await this.userRepo.findByEmail(
      input.organizationId,
      input.email.toLowerCase().trim(),
    );

    // Always return without revealing whether the email exists
    if (!user || user.status !== 'ACTIVE') return;

    const resetToken = generateToken();
    const resetTokenHash = hashToken(resetToken);
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetTokenExpiresAt = resetTokenExpiresAt;
    await this.userRepo.save(user);

    await this.emailSender.sendPasswordReset({
      to: user.email,
      name: user.name,
      token: resetToken,
      expiresInMinutes: 60,
    });
  }
}
