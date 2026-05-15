import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import {
  type CreateSessionInput,
  type ISessionRepository,
} from '../../application/ports/session.repository.port';
import { Session } from '../../domain/entities/session.entity';

@Injectable()
export class AuthSessionTypeormRepository implements ISessionRepository {
  constructor(@InjectRepository(Session) private readonly repo: Repository<Session>) {}

  async create(input: CreateSessionInput): Promise<Session> {
    const session = this.repo.create(input);
    return this.repo.save(session);
  }

  async findById(id: string): Promise<Session | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findActiveByFamily(family: string): Promise<Session[]> {
    return this.repo.find({
      where: { family, revokedAt: IsNull() },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async revokeFamily(family: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date() })
      .where('family = :family AND revoked_at IS NULL', { family })
      .execute();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Session)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId AND revoked_at IS NULL', { userId })
      .execute();
  }

  async markReplaced(oldId: string, newId: string): Promise<void> {
    await this.repo.update(oldId, { replacedById: newId });
  }
}
