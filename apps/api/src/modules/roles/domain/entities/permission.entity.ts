import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../../shared/entities/base.entity';

@Entity({ name: 'permissions' })
export class Permission extends BaseEntity {
  @Column({ type: 'text', unique: true })
  key!: string;

  @Column({ type: 'text' })
  resource!: string;

  @Column({ type: 'text' })
  action!: string;

  @Column({ type: 'text', nullable: true })
  scope?: string | null;
}
