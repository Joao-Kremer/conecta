import { BadRequestException, Injectable } from '@nestjs/common';

import { IUserRepository } from '../ports/user.repository.port';
import { hashToken } from '../utils/token.utils';

export interface VerifyEmailInput {
  token: string;
}

@Injectable()
export class VerifyEmailUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: VerifyEmailInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const user = await this.userRepo.findByVerificationToken(tokenHash);

    if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.status = 'ACTIVE';
    user.emailVerifiedAt = new Date();
    user.verificationTokenHash = null;
    user.verificationTokenExpiresAt = null;

    await this.userRepo.save(user);
  }
}
