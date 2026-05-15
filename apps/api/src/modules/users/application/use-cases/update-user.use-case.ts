import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IUserRepository } from '../ports/user.repository.port';

export interface UpdateUserInput {
  userId: string;
  name?: string;
  avatarUrl?: string | null;
}

export interface UpdateUserOutput {
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
export class UpdateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: UpdateUserInput): Promise<UpdateUserOutput> {
    const existing = await this.userRepo.findById(input.userId);

    if (!existing) {
      throw new NotFoundException('USER_NOT_FOUND', 'User not found');
    }

    const updated = await this.userRepo.update(input.userId, {
      name: input.name,
      avatarUrl: input.avatarUrl,
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl ?? null,
      status: updated.status,
      emailVerifiedAt: updated.emailVerifiedAt ?? null,
      lastLoginAt: updated.lastLoginAt ?? null,
      mfaEnabled: updated.mfaEnabled,
      createdAt: updated.createdAt,
    };
  }
}
