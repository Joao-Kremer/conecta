import { Injectable } from '@nestjs/common';

import {
  ConflictException,
  NotFoundException,
} from '../../../../shared/exceptions/domain.exception';
import { type UserRole } from '../../domain/entities/user-role.entity';
import { IRoleRepository, IUserRoleRepository } from '../ports/role.repository.port';

export interface AssignRoleInput {
  targetUserId: string;
  roleKey: string;
  assignedBy: string;
  organizationId: string;
}

@Injectable()
export class AssignRoleUseCase {
  constructor(
    private readonly roleRepo: IRoleRepository,
    private readonly userRoleRepo: IUserRoleRepository,
  ) {}

  async execute(input: AssignRoleInput): Promise<UserRole> {
    const role = await this.roleRepo.findByKey(input.roleKey);

    if (!role) {
      throw new NotFoundException('ROLE_NOT_FOUND', 'Role not found');
    }

    const alreadyAssigned = await this.userRoleRepo.exists(input.targetUserId, role.id);

    if (alreadyAssigned) {
      throw new ConflictException('ROLE_ALREADY_ASSIGNED', 'Role is already assigned to this user');
    }

    return this.userRoleRepo.assign(input.targetUserId, role.id, input.assignedBy);
  }
}
