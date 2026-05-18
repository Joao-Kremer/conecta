import { Column, Entity } from 'typeorm';

import { encryptedTransformer } from '../../../../infrastructure/crypto/encryption.transformer';
import { SoftDeletableEntity } from '../../../../shared/entities/soft-deletable.entity';

@Entity({ name: 'students' })
export class Student extends SoftDeletableEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'full_name_encrypted', type: 'text', transformer: encryptedTransformer })
  fullName!: string;

  @Column({ name: 'full_name_search', type: 'text' })
  fullNameSearch!: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate!: string;

  @Column({ name: 'document_encrypted', type: 'text', nullable: true, transformer: encryptedTransformer })
  document?: string | null;

  @Column({ name: 'document_search', type: 'text', nullable: true })
  documentSearch?: string | null;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string | null;

  @Column({ name: 'medical_notes_encrypted', type: 'text', nullable: true, transformer: encryptedTransformer })
  medicalNotes?: string | null;

  @Column({ name: 'allergies_encrypted', type: 'text', nullable: true, transformer: encryptedTransformer })
  allergies?: string | null;

  @Column({ name: 'medications_encrypted', type: 'text', nullable: true, transformer: encryptedTransformer })
  medications?: string | null;

  @Column({ name: 'uniform_size', type: 'text', nullable: true })
  uniformSize?: string | null;

  @Column({ name: 'emergency_contact', type: 'jsonb', nullable: true })
  emergencyContact?: { name: string; phone: string; relationship: string } | null;

  @Column({ type: 'text', default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'anonymized_at', type: 'timestamptz', nullable: true })
  anonymizedAt?: Date | null;
}
