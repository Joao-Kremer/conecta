import { Injectable, NotFoundException } from '@nestjs/common';

import { IUserRoleRepository } from '../ports/user-role.repository.port';
import { IUserRepository } from '../ports/user.repository.port';

export interface MeOutput {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: string;
  emailVerifiedAt: Date | null;
  roles: string[];
}

@Injectable()
export class MeUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly userRoleRepo: IUserRoleRepository,
  ) {}

  async execute(userId: string): Promise<MeOutput> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const roles = await this.userRoleRepo.getUserRoleKeys(userId);

    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      roles,
    };
  }
}
