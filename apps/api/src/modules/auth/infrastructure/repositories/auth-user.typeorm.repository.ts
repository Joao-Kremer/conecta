import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../../users/domain/entities/user.entity';
import {
  type CreateUserInput,
  type IUserRepository,
} from '../../application/ports/user.repository.port';

@Injectable()
export class AuthUserTypeormRepository implements IUserRepository {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findByEmail(organizationId: string, email: string): Promise<User | null> {
    return this.repo.findOne({ where: { organizationId, email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const user = this.repo.create(input);
    return this.repo.save(user);
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async findByVerificationToken(tokenHash: string): Promise<User | null> {
    return this.repo.findOne({ where: { verificationTokenHash: tokenHash } });
  }

  async findByPasswordResetToken(tokenHash: string): Promise<User | null> {
    return this.repo.findOne({ where: { passwordResetTokenHash: tokenHash } });
  }

  async countByEmail(email: string): Promise<number> {
    return this.repo.countBy({ email });
  }
}
