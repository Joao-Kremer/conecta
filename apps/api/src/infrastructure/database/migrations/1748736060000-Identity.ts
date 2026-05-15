import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Identity1748736060000 implements MigrationInterface {
  name = 'Identity1748736060000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id      uuid        NOT NULL,
        email                text        NOT NULL,
        password_hash        text        NOT NULL,
        name                 text        NOT NULL,
        phone_encrypted      text,
        avatar_url           text,
        status               text        NOT NULL DEFAULT 'PENDING',
        email_verified_at    timestamptz,
        last_login_at        timestamptz,
        mfa_enabled          boolean     NOT NULL DEFAULT false,
        mfa_secret_encrypted text,
        created_at           timestamptz NOT NULL DEFAULT now(),
        updated_at           timestamptz NOT NULL DEFAULT now(),
        deleted_at           timestamptz,
        CONSTRAINT pk_users PRIMARY KEY (id),
        CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT uq_users_org_email UNIQUE (organization_id, email),
        CONSTRAINT ck_users_status CHECK (status IN ('PENDING','ACTIVE','DISABLED'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_users_organization_id ON users (organization_id)`);
    await queryRunner.query(`
      CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE roles (
        id              uuid NOT NULL DEFAULT gen_random_uuid(),
        key             text NOT NULL,
        name            text NOT NULL,
        description     text,
        organization_id uuid,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_roles PRIMARY KEY (id),
        CONSTRAINT uq_roles_org_key UNIQUE NULLS NOT DISTINCT (organization_id, key)
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_roles_updated_at
        BEFORE UPDATE ON roles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE permissions (
        id       uuid NOT NULL DEFAULT gen_random_uuid(),
        key      text NOT NULL,
        resource text NOT NULL,
        action   text NOT NULL,
        scope    text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_permissions PRIMARY KEY (id),
        CONSTRAINT uq_permissions_key UNIQUE (key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE role_permissions (
        role_id       uuid NOT NULL,
        permission_id uuid NOT NULL,
        CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
        CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id     uuid        NOT NULL,
        role_id     uuid        NOT NULL,
        assigned_at timestamptz NOT NULL DEFAULT now(),
        assigned_by uuid,
        CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
        CONSTRAINT fk_ur_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE staff_schools (
        user_id         uuid        NOT NULL,
        school_id       uuid        NOT NULL,
        organization_id uuid        NOT NULL,
        assigned_at     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_staff_schools PRIMARY KEY (user_id, school_id),
        CONSTRAINT fk_ss_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_ss_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        CONSTRAINT fk_ss_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE coach_classes (
        user_id         uuid        NOT NULL,
        class_id        uuid        NOT NULL,
        organization_id uuid        NOT NULL,
        assigned_at     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_coach_classes PRIMARY KEY (user_id, class_id),
        CONSTRAINT fk_cc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_cc_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        CONSTRAINT fk_cc_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS coach_classes`);
    await queryRunner.query(`DROP TABLE IF EXISTS staff_schools`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
