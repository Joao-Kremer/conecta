import { Column, Entity } from 'typeorm';

import { encryptedTransformer } from '../../../../infrastructure/crypto/encryption.transformer';
import { SoftDeletableEntity } from '../../../../shared/entities/soft-deletable.entity';

@Entity({ name: 'guardians' })
export class Guardian extends SoftDeletableEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'full_name_encrypted', type: 'text', transformer: encryptedTransformer })
  fullName!: string;

  @Column({ name: 'full_name_search', type: 'text' })
  fullNameSearch!: string;

  @Column({ name: 'document_encrypted', type: 'text', nullable: true, transformer: encryptedTransformer })
  document?: string | null;

  @Column({ name: 'document_search', type: 'text', nullable: true })
  documentSearch?: string | null;

  @Column({ name: 'phone_encrypted', type: 'text', transformer: encryptedTransformer })
  phone!: string;

  @Column({ name: 'phone_search', type: 'text' })
  phoneSearch!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'jsonb', nullable: true })
  address?: Record<string, unknown> | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'anonymized_at', type: 'timestamptz', nullable: true })
  anonymizedAt?: Date | null;
}
