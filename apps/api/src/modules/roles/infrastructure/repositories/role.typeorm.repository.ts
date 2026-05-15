import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IRoleRepository } from '../../application/ports/role.repository.port';
import { Role } from '../../domain/entities/role.entity';

@Injectable()
export class RoleTypeormRepository implements IRoleRepository {
  constructor(@InjectRepository(Role) private readonly repo: Repository<Role>) {}

  async findAll(): Promise<Role[]> {
    return this.repo.find();
  }

  async findByKey(key: string): Promise<Role | null> {
    return this.repo.findOne({ where: { key } });
  }

  async findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }
}
