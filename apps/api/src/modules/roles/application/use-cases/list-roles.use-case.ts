import { Injectable } from '@nestjs/common';

import { type Role } from '../../domain/entities/role.entity';
import { IRoleRepository } from '../ports/role.repository.port';

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly roleRepo: IRoleRepository) {}

  async execute(): Promise<Role[]> {
    return this.roleRepo.findAll();
  }
}
