import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  type IUserRepository,
  type UpdateUserData,
} from '../../application/ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserTypeormRepository implements IUserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAllByOrganization(organizationId: string): Promise<User[]> {
    return this.repo.find({ where: { organizationId } });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new Error(`User ${id} not found during update`);
    }
    Object.assign(user, data);
    return this.repo.save(user);
  }
}
