import { Column, Entity } from 'typeorm';

import { SoftDeletableEntity } from '../../../../shared/entities/soft-deletable.entity';

@Entity({ name: 'modalities' })
export class Modality extends SoftDeletableEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'text', nullable: true })
  color?: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
