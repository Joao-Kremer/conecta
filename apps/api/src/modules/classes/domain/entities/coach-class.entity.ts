import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'coach_classes' })
export class CoachClass {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @PrimaryColumn({ name: 'class_id', type: 'uuid' })
  classId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;
}
