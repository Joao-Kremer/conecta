import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'staff_schools' })
export class StaffSchool {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'school_id', type: 'uuid' })
  schoolId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;
}
