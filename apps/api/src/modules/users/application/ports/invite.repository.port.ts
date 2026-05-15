import { type Invite } from '../../../auth/domain/entities/invite.entity';

export interface CreateInviteData {
  id: string;
  organizationId: string;
  email: string;
  roleKey: string;
  schoolIds?: string[] | null;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}

export abstract class IInviteRepository {
  abstract create(data: CreateInviteData): Promise<Invite>;
  abstract findById(id: string, organizationId: string): Promise<Invite | null>;
  abstract findActiveByEmail(organizationId: string, email: string): Promise<Invite | null>;
  abstract revoke(id: string): Promise<void>;
  abstract findAllByOrganization(organizationId: string): Promise<Invite[]>;
}
