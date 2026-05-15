import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { Invite } from '../../../auth/domain/entities/invite.entity';
import {
  type CreateInviteData,
  type IInviteRepository,
} from '../../application/ports/invite.repository.port';

@Injectable()
export class InviteTypeormRepository implements IInviteRepository {
  constructor(@InjectRepository(Invite) private readonly repo: Repository<Invite>) {}

  async create(data: CreateInviteData): Promise<Invite> {
    const invite = this.repo.create({
      id: data.id,
      organizationId: data.organizationId,
      email: data.email,
      roleKey: data.roleKey,
      schoolIds: data.schoolIds ?? null,
      tokenHash: data.tokenHash,
      invitedBy: data.invitedBy,
      expiresAt: data.expiresAt,
    });
    return this.repo.save(invite);
  }

  async findById(id: string, organizationId: string): Promise<Invite | null> {
    return this.repo.findOne({ where: { id, organizationId } });
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

  async revoke(id: string): Promise<void> {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async findAllByOrganization(organizationId: string): Promise<Invite[]> {
    return this.repo.find({ where: { organizationId } });
  }
}
