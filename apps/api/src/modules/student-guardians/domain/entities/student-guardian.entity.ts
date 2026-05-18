import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'student_guardians' })
export class StudentGuardian {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId!: string;

  @Column({ name: 'guardian_id', type: 'uuid' })
  guardianId!: string;

  @Column({ name: 'relationship', type: 'text' })
  relationship!: string;

  @Column({ name: 'is_primary_payer', type: 'boolean', default: false })
  isPrimaryPayer!: boolean;

  @Column({ name: 'receives_communications', type: 'boolean', default: true })
  receivesCommunications!: boolean;

  @Column({ name: 'is_emergency_contact', type: 'boolean', default: false })
  isEmergencyContact!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
