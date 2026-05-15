import { Column, Entity } from 'typeorm';

import { SoftDeletableEntity } from '../../../../shared/entities/soft-deletable.entity';

@Entity({ name: 'classes' })
export class ClassEntity extends SoftDeletableEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'school_modality_id', type: 'uuid' })
  schoolModalityId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'age_group', type: 'text', nullable: true })
  ageGroup?: string | null;

  @Column({ type: 'jsonb' })
  schedule!: Array<{ weekday: number; start: string; end: string }>;

  @Column({ type: 'text', nullable: true })
  location?: string | null;

  @Column({ type: 'integer', nullable: true })
  capacity?: number | null;

  @Column({ name: 'monthly_fee_cents', type: 'integer', nullable: true })
  monthlyFeeCents?: number | null;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: string;
}
