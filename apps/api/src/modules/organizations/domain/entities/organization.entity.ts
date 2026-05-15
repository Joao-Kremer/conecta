import { Column, Entity } from 'typeorm';

import { SoftDeletableEntity } from '../../../../shared/entities/soft-deletable.entity';

@Entity({ name: 'organizations' })
export class Organization extends SoftDeletableEntity {
  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ name: 'document_encrypted', type: 'text', nullable: true })
  documentEncrypted?: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  settings!: Record<string, unknown>;

  @Column({ type: 'text', default: 'free' })
  plan!: string;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: string;
}
