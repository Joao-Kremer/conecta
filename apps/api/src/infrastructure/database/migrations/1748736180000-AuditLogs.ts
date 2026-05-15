import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AuditLogs1748736180000 implements MigrationInterface {
  name = 'AuditLogs1748736180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id              uuid        NOT NULL DEFAULT gen_random_uuid(),
        organization_id uuid        NOT NULL,
        school_id       uuid,
        actor_user_id   uuid,
        action          text        NOT NULL,
        resource        text        NOT NULL,
        resource_id     uuid,
        before          jsonb,
        after           jsonb,
        ip              text,
        user_agent      text,
        request_id      text,
        created_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_audit_logs PRIMARY KEY (id),
        CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_org_resource ON audit_logs (organization_id, resource, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, created_at DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
  }
}
