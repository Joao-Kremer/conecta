import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../../shared/entities/base.entity';

@Entity({ name: 'roles' })
export class Role extends BaseEntity {
  @Column({ type: 'text' })
  key!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId?: string | null;
}
