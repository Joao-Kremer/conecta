import { BadRequestException, Injectable } from '@nestjs/common';

import { PasswordService } from '../../../../infrastructure/crypto/password.service';
import { ISessionRepository } from '../ports/session.repository.port';
import { IUserRepository } from '../ports/user.repository.port';
import { validatePassword } from '../utils/password.utils';
import { hashToken } from '../utils/token.utils';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionRepo: ISessionRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    const pw = validatePassword(input.newPassword);
    if (!pw.valid) {
      throw new BadRequestException(pw.reason);
    }

    const tokenHash = hashToken(input.token);
    const user = await this.userRepo.findByPasswordResetToken(tokenHash);

    if (!user || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await this.passwordService.hash(input.newPassword);
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    await this.userRepo.save(user);

    await this.sessionRepo.revokeAllForUser(user.id);
  }
}
