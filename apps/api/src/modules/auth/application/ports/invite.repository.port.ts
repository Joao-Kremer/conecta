import { type Invite } from '../../domain/entities/invite.entity';

export abstract class IInviteRepository {
  abstract findByTokenHash(tokenHash: string): Promise<Invite | null>;
  abstract findActiveByEmail(organizationId: string, email: string): Promise<Invite | null>;
  abstract markAccepted(id: string): Promise<void>;
  abstract save(invite: Invite): Promise<Invite>;
}
