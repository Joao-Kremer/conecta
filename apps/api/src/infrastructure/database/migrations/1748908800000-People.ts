import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class People1748908800000 implements MigrationInterface {
  name = 'People1748908800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE students (
        id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id         uuid        NOT NULL,
        full_name_encrypted     text        NOT NULL,
        full_name_search        text        NOT NULL,
        birth_date              date        NOT NULL,
        document_encrypted      text,
        document_search         text,
        photo_url               text,
        medical_notes_encrypted text,
        allergies_encrypted     text,
        medications_encrypted   text,
        uniform_size            text,
        emergency_contact       jsonb,
        status                  text        NOT NULL DEFAULT 'ACTIVE',
        anonymized_at           timestamptz,
        created_at              timestamptz NOT NULL DEFAULT now(),
        updated_at              timestamptz NOT NULL DEFAULT now(),
        deleted_at              timestamptz,
        CONSTRAINT pk_students PRIMARY KEY (id),
        CONSTRAINT fk_students_organization
          FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
        CONSTRAINT chk_students_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
        CONSTRAINT chk_students_uniform_size
          CHECK (uniform_size IS NULL OR uniform_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG'))
      );
      CREATE INDEX idx_students_org_name ON students (organization_id, full_name_search);
      CREATE INDEX idx_students_org_document ON students (organization_id, document_search);
    `);

    await queryRunner.query(`
      CREATE TABLE guardians (
        id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id     uuid        NOT NULL,
        full_name_encrypted text        NOT NULL,
        full_name_search    text        NOT NULL,
        document_encrypted  text,
        document_search     text,
        phone_encrypted     text        NOT NULL,
        phone_search        text        NOT NULL,
        email               text        NOT NULL,
        address             jsonb,
        user_id             uuid,
        anonymized_at       timestamptz,
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        deleted_at          timestamptz,
        CONSTRAINT pk_guardians PRIMARY KEY (id),
        CONSTRAINT fk_guardians_organization
          FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
        CONSTRAINT fk_guardians_user
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
      );
      CREATE INDEX idx_guardians_org_email ON guardians (organization_id, email);
      CREATE INDEX idx_guardians_org_user ON guardians (organization_id, user_id);
      CREATE INDEX idx_guardians_org_name ON guardians (organization_id, full_name_search);
      CREATE INDEX idx_guardians_org_document ON guardians (organization_id, document_search);
      CREATE INDEX idx_guardians_org_phone ON guardians (organization_id, phone_search);
    `);

    await queryRunner.query(`
      CREATE TABLE student_guardians (
        id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id         uuid        NOT NULL,
        student_id              uuid        NOT NULL,
        guardian_id             uuid        NOT NULL,
        relationship            text        NOT NULL,
        is_primary_payer        boolean     NOT NULL DEFAULT false,
        receives_communications boolean     NOT NULL DEFAULT true,
        is_emergency_contact    boolean     NOT NULL DEFAULT false,
        created_at              timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_student_guardians PRIMARY KEY (id),
        CONSTRAINT fk_student_guardians_organization
          FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
        CONSTRAINT fk_student_guardians_student
          FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE RESTRICT,
        CONSTRAINT fk_student_guardians_guardian
          FOREIGN KEY (guardian_id) REFERENCES guardians (id) ON DELETE RESTRICT,
        CONSTRAINT chk_student_guardians_relationship
          CHECK (relationship IN ('FATHER', 'MOTHER', 'GRANDPARENT', 'OTHER')),
        CONSTRAINT uq_student_guardians UNIQUE (student_id, guardian_id)
      );
      CREATE INDEX idx_student_guardians_org_student ON student_guardians (organization_id, student_id);
      CREATE INDEX idx_student_guardians_org_guardian ON student_guardians (organization_id, guardian_id);
    `);

    await queryRunner.query(`
      CREATE TABLE consents (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id uuid        NOT NULL,
        guardian_id     uuid        NOT NULL,
        student_id      uuid,
        terms_version   text        NOT NULL,
        accepted_at     timestamptz NOT NULL DEFAULT now(),
        revoked_at      timestamptz,
        ip              text        NOT NULL,
        user_agent      text,
        granted_for     jsonb       NOT NULL,
        CONSTRAINT pk_consents PRIMARY KEY (id),
        CONSTRAINT fk_consents_organization
          FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
        CONSTRAINT fk_consents_guardian
          FOREIGN KEY (guardian_id) REFERENCES guardians (id) ON DELETE RESTRICT,
        CONSTRAINT fk_consents_student
          FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE SET NULL
      );
      CREATE INDEX idx_consents_org_guardian ON consents (organization_id, guardian_id);
      CREATE INDEX idx_consents_org_student ON consents (organization_id, student_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS consents');
    await queryRunner.query('DROP TABLE IF EXISTS student_guardians');
    await queryRunner.query('DROP TABLE IF EXISTS guardians');
    await queryRunner.query('DROP TABLE IF EXISTS students');
  }
}
