import { Column, Entity } from 'typeorm';

import { SoftDeletableEntity } from '../../../../shared/entities/soft-deletable.entity';

@Entity({ name: 'schools' })
export class School extends SoftDeletableEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text', default: 'America/Sao_Paulo' })
  timezone!: string;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: string;
}
