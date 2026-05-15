import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IUserRepository } from '../ports/user.repository.port';

export interface FindUserInput {
  userId: string;
}

export interface FindUserOutput {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  mfaEnabled: boolean;
  createdAt: Date;
}

@Injectable()
export class FindUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: FindUserInput): Promise<FindUserOutput> {
    const user = await this.userRepo.findById(input.userId);

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND', 'User not found');
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    };
  }
}
