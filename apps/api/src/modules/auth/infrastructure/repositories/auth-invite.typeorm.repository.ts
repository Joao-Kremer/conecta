import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { type IInviteRepository } from '../../application/ports/invite.repository.port';
import { Invite } from '../../domain/entities/invite.entity';

@Injectable()
export class AuthInviteTypeormRepository implements IInviteRepository {
  constructor(@InjectRepository(Invite) private readonly repo: Repository<Invite>) {}

  async findByTokenHash(tokenHash: string): Promise<Invite | null> {
    return this.repo.findOne({
      where: { tokenHash, acceptedAt: IsNull(), revokedAt: IsNull() },
    });
  }

  async findActiveByEmail(organizationId: string, email: string): Promise<Invite | null> {
    return this.repo.findOne({
      where: {
        organizationId,
        email,
        acceptedAt: IsNull(),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async markAccepted(id: string): Promise<void> {
    await this.repo.update(id, { acceptedAt: new Date() });
  }

  async save(invite: Invite): Promise<Invite> {
    return this.repo.save(invite);
  }
}
