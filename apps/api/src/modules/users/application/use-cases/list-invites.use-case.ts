import { Injectable } from '@nestjs/common';

import { type Invite } from '../../../auth/domain/entities/invite.entity';
import { IInviteRepository } from '../ports/invite.repository.port';

export interface ListInvitesInput {
  organizationId: string;
}

@Injectable()
export class ListInvitesUseCase {
  constructor(private readonly inviteRepo: IInviteRepository) {}

  async execute(input: ListInvitesInput): Promise<Invite[]> {
    return this.inviteRepo.findAllByOrganization(input.organizationId);
  }
}
