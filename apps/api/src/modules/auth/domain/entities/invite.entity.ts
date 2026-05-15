import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../../shared/entities/base.entity';

@Entity({ name: 'invites' })
export class Invite extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ name: 'role_key', type: 'text' })
  roleKey!: string;

  @Column({ name: 'school_ids', type: 'jsonb', nullable: true })
  schoolIds?: string[] | null;

  @Column({ name: 'token_hash', type: 'text' })
  tokenHash!: string;

  @Column({ name: 'invited_by', type: 'uuid' })
  invitedBy!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  context?: Record<string, unknown> | null;
}
