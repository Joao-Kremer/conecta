import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class Sessions1748736120000 implements MigrationInterface {
  name = 'Sessions1748736120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sessions (
        id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
        user_id            uuid        NOT NULL,
        refresh_token_hash text        NOT NULL,
        family             uuid        NOT NULL,
        user_agent         text,
        ip                 text,
        expires_at         timestamptz NOT NULL,
        revoked_at         timestamptz,
        replaced_by_id     uuid,
        created_at         timestamptz NOT NULL DEFAULT now(),
        updated_at         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_sessions PRIMARY KEY (id),
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sessions_replaced_by FOREIGN KEY (replaced_by_id) REFERENCES sessions(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_sessions_user_revoked ON sessions (user_id, revoked_at)`);
    await queryRunner.query(`CREATE INDEX idx_sessions_family ON sessions (family)`);

    await queryRunner.query(`
      CREATE TABLE invites (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id uuid        NOT NULL,
        email           text        NOT NULL,
        role_key        text        NOT NULL,
        school_ids      jsonb,
        token_hash      text        NOT NULL,
        invited_by      uuid        NOT NULL,
        expires_at      timestamptz NOT NULL,
        accepted_at     timestamptz,
        revoked_at      timestamptz,
        context         jsonb,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_invites PRIMARY KEY (id),
        CONSTRAINT fk_invites_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
        CONSTRAINT fk_invites_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_invites_org ON invites (organization_id)`);
    await queryRunner.query(`CREATE INDEX idx_invites_email ON invites (organization_id, email)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS invites`);
    await queryRunner.query(`DROP TABLE IF EXISTS sessions`);
  }
}
