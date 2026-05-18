import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

export type ConsentPurpose = 'data_processing' | 'photo_use' | 'communications' | 'marketing';

// Append-only (LGPD): rows are never edited. A revocation is a NEW row with
// `revokedAt` set referencing the same guardian/student. See 04-SECURITY_AND_LGPD.
@Entity({ name: 'consents' })
export class Consent {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'guardian_id', type: 'uuid' })
  guardianId!: string;

  @Column({ name: 'student_id', type: 'uuid', nullable: true })
  studentId?: string | null;

  @Column({ name: 'terms_version', type: 'text' })
  termsVersion!: string;

  @CreateDateColumn({ name: 'accepted_at', type: 'timestamptz' })
  acceptedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'text' })
  ip!: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ name: 'granted_for', type: 'jsonb' })
  grantedFor!: ConsentPurpose[];
}
