import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Hierarchy1748736000000 implements MigrationInterface {
  name = 'Hierarchy1748736000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organizations (
        id            uuid        NOT NULL DEFAULT gen_random_uuid(),
        name          text        NOT NULL,
        slug          text        NOT NULL,
        document_encrypted text,
        logo_url      text,
        settings      jsonb       NOT NULL DEFAULT '{}',
        plan          text        NOT NULL DEFAULT 'free',
        status        text        NOT NULL DEFAULT 'ACTIVE',
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        deleted_at    timestamptz,
        CONSTRAINT pk_organizations PRIMARY KEY (id),
        CONSTRAINT uq_organizations_slug UNIQUE (slug),
        CONSTRAINT ck_organizations_status CHECK (status IN ('ACTIVE','SUSPENDED'))
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_organizations_updated_at
        BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE schools (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id uuid        NOT NULL,
        name            text        NOT NULL,
        slug            text        NOT NULL,
        address         jsonb,
        phone           text,
        email           text,
        timezone        text        NOT NULL DEFAULT 'America/Sao_Paulo',
        status          text        NOT NULL DEFAULT 'ACTIVE',
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        deleted_at      timestamptz,
        CONSTRAINT pk_schools PRIMARY KEY (id),
        CONSTRAINT fk_schools_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT uq_schools_org_slug UNIQUE (organization_id, slug),
        CONSTRAINT ck_schools_status CHECK (status IN ('ACTIVE','INACTIVE'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_schools_organization_id ON schools (organization_id)`);
    await queryRunner.query(`
      CREATE TRIGGER trg_schools_updated_at
        BEFORE UPDATE ON schools
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE modalities (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id uuid        NOT NULL,
        name            text        NOT NULL,
        description     text,
        color           text,
        active          boolean     NOT NULL DEFAULT true,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        deleted_at      timestamptz,
        CONSTRAINT pk_modalities PRIMARY KEY (id),
        CONSTRAINT fk_modalities_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT uq_modalities_org_name UNIQUE (organization_id, name)
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_modalities_updated_at
        BEFORE UPDATE ON modalities
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE school_modalities (
        id                          uuid    NOT NULL DEFAULT gen_random_uuid(),
        organization_id             uuid    NOT NULL,
        school_id                   uuid    NOT NULL,
        modality_id                 uuid    NOT NULL,
        default_monthly_fee_cents   integer NOT NULL,
        default_enrollment_fee_cents integer NOT NULL DEFAULT 0,
        active                      boolean NOT NULL DEFAULT true,
        created_at                  timestamptz NOT NULL DEFAULT now(),
        updated_at                  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_school_modalities PRIMARY KEY (id),
        CONSTRAINT fk_school_modalities_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_school_modalities_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,
        CONSTRAINT fk_school_modalities_modality FOREIGN KEY (modality_id) REFERENCES modalities(id) ON DELETE RESTRICT,
        CONSTRAINT uq_school_modalities UNIQUE (school_id, modality_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_school_modalities_org_school ON school_modalities (organization_id, school_id)`);
    await queryRunner.query(`
      CREATE TRIGGER trg_school_modalities_updated_at
        BEFORE UPDATE ON school_modalities
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE classes (
        id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id     uuid        NOT NULL,
        school_id           uuid        NOT NULL,
        school_modality_id  uuid        NOT NULL,
        name                text        NOT NULL,
        age_group           text,
        schedule            jsonb       NOT NULL,
        location            text,
        capacity            integer,
        monthly_fee_cents   integer,
        status              text        NOT NULL DEFAULT 'ACTIVE',
        created_at          timestamptz NOT NULL DEFAULT now(),
        updated_at          timestamptz NOT NULL DEFAULT now(),
        deleted_at          timestamptz,
        CONSTRAINT pk_classes PRIMARY KEY (id),
        CONSTRAINT fk_classes_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT,
        CONSTRAINT fk_classes_school_modality FOREIGN KEY (school_modality_id) REFERENCES school_modalities(id) ON DELETE RESTRICT,
        CONSTRAINT ck_classes_status CHECK (status IN ('ACTIVE','INACTIVE'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_classes_org_school ON classes (organization_id, school_id, school_modality_id)`);
    await queryRunner.query(`
      CREATE TRIGGER trg_classes_updated_at
        BEFORE UPDATE ON classes
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS classes`);
    await queryRunner.query(`DROP TABLE IF EXISTS school_modalities`);
    await queryRunner.query(`DROP TABLE IF EXISTS modalities`);
    await queryRunner.query(`DROP TABLE IF EXISTS schools`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations`);
  }
}
