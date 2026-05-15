import { Injectable } from '@nestjs/common';

import { IUserRepository } from '../ports/user.repository.port';

export interface ListUsersInput {
  organizationId: string;
}

export interface UserSummary {
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
export class ListUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: ListUsersInput): Promise<UserSummary[]> {
    const users = await this.userRepo.findAllByOrganization(input.organizationId);

    return users.map((user) => ({
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
    }));
  }
}
