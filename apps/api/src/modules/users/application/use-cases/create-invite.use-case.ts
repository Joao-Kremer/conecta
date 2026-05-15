import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import { ConflictException } from '../../../../shared/exceptions/domain.exception';
import { IInviteRepository } from '../ports/invite.repository.port';

export interface CreateInviteInput {
  organizationId: string;
  email: string;
  roleKey: string;
  schoolIds?: string[] | null;
  invitedBy: string;
}

export interface CreateInviteOutput {
  inviteId: string;
  token: string;
}

@Injectable()
export class CreateInviteUseCase {
  constructor(private readonly inviteRepo: IInviteRepository) {}

  async execute(input: CreateInviteInput): Promise<CreateInviteOutput> {
    const existing = await this.inviteRepo.findActiveByEmail(input.organizationId, input.email);

    if (existing) {
      throw new ConflictException(
        'INVITE_ALREADY_PENDING',
        'An active invite already exists for this email',
      );
    }

    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const id = uuidv7();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.inviteRepo.create({
      id,
      organizationId: input.organizationId,
      email: input.email,
      roleKey: input.roleKey,
      schoolIds: input.schoolIds ?? null,
      tokenHash,
      invitedBy: input.invitedBy,
      expiresAt,
    });

    return { inviteId: id, token: raw };
  }
}
