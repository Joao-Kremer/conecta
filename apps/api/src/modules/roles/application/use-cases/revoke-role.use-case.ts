import { Injectable } from '@nestjs/common';

import { NotFoundException } from '../../../../shared/exceptions/domain.exception';
import { IUserRoleRepository } from '../ports/role.repository.port';

export interface RevokeRoleInput {
  targetUserId: string;
  roleId: string;
  organizationId: string;
}

@Injectable()
export class RevokeRoleUseCase {
  constructor(private readonly userRoleRepo: IUserRoleRepository) {}

  async execute(input: RevokeRoleInput): Promise<void> {
    const assigned = await this.userRoleRepo.exists(input.targetUserId, input.roleId);

    if (!assigned) {
      throw new NotFoundException('USER_ROLE_NOT_FOUND', 'Role assignment not found for this user');
    }

    await this.userRoleRepo.revoke(input.targetUserId, input.roleId);
  }
}
