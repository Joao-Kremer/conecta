import { Column, Entity } from 'typeorm';

import { BaseEntity } from '../../../../shared/entities/base.entity';

@Entity({ name: 'school_modalities' })
export class SchoolModality extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'modality_id', type: 'uuid' })
  modalityId!: string;

  @Column({ name: 'default_monthly_fee_cents', type: 'integer' })
  defaultMonthlyFeeCents!: number;

  @Column({ name: 'default_enrollment_fee_cents', type: 'integer', default: 0 })
  defaultEnrollmentFeeCents!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;
}
