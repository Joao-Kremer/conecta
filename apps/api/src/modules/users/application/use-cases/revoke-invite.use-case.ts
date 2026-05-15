import { Injectable } from '@nestjs/common';

import {
  NotFoundException,
  UnprocessableException,
} from '../../../../shared/exceptions/domain.exception';
import { IInviteRepository } from '../ports/invite.repository.port';

export interface RevokeInviteInput {
  inviteId: string;
  organizationId: string;
}

@Injectable()
export class RevokeInviteUseCase {
  constructor(private readonly inviteRepo: IInviteRepository) {}

  async execute(input: RevokeInviteInput): Promise<void> {
    const invite = await this.inviteRepo.findById(input.inviteId, input.organizationId);

    if (!invite) {
      throw new NotFoundException('INVITE_NOT_FOUND', 'Invite not found');
    }

    if (invite.acceptedAt !== null || invite.revokedAt !== null) {
      throw new UnprocessableException(
        'INVITE_ALREADY_USED',
        'Invite is already accepted or revoked',
      );
    }

    await this.inviteRepo.revoke(input.inviteId);
  }
}
