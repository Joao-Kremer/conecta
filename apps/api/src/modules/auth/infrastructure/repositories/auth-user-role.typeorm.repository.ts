import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Role } from '../../../roles/domain/entities/role.entity';
import { UserRole } from '../../../roles/domain/entities/user-role.entity';
import { StaffSchool } from '../../../schools/domain/entities/staff-school.entity';
import { type IUserRoleRepository } from '../../application/ports/user-role.repository.port';

@Injectable()
export class AuthUserRoleTypeormRepository implements IUserRoleRepository {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(StaffSchool) private readonly staffSchoolRepo: Repository<StaffSchool>,
  ) {}

  async findRoleIdByKey(key: string): Promise<string | null> {
    const role = await this.roleRepo.findOne({
      where: { key, organizationId: IsNull() },
      select: { id: true },
    });
    return role?.id ?? null;
  }

  async assignRole(userId: string, roleId: string, assignedBy?: string): Promise<void> {
    await this.userRoleRepo
      .createQueryBuilder()
      .insert()
      .into(UserRole)
      .values({ userId, roleId, assignedBy: assignedBy ?? null })
      .orIgnore()
      .execute();
  }

  async getUserRoleKeys(userId: string): Promise<string[]> {
    const rows = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .select('r.key', 'key')
      .where('ur.user_id = :userId', { userId })
      .getRawMany<{ key: string }>();
    return rows.map((r) => r.key);
  }

  async assignStaffSchool(
    userId: string,
    schoolId: string,
    organizationId: string,
  ): Promise<void> {
    await this.staffSchoolRepo
      .createQueryBuilder()
      .insert()
      .into(StaffSchool)
      .values({ userId, schoolId, organizationId })
      .orIgnore()
      .execute();
  }
}
