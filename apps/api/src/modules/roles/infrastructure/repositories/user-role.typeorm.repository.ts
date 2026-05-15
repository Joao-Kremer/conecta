import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IUserRoleRepository } from '../../application/ports/role.repository.port';
import { UserRole } from '../../domain/entities/user-role.entity';

@Injectable()
export class UserRoleTypeormRepository implements IUserRoleRepository {
  constructor(@InjectRepository(UserRole) private readonly repo: Repository<UserRole>) {}

  async assign(userId: string, roleId: string, assignedBy: string): Promise<UserRole> {
    const userRole = this.repo.create({ userId, roleId, assignedBy });
    return this.repo.save(userRole);
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    await this.repo.delete({ userId, roleId });
  }

  async findByUser(userId: string): Promise<UserRole[]> {
    return this.repo.find({ where: { userId } });
  }

  async exists(userId: string, roleId: string): Promise<boolean> {
    return this.repo.existsBy({ userId, roleId });
  }
}
