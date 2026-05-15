import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class OrganizationThemeDefaults1748822400000 implements MigrationInterface {
  name = 'OrganizationThemeDefaults1748822400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organizations
      SET settings = settings || '{"theme": {"primary": "#2563eb", "mode": "light"}}'::jsonb
      WHERE settings->'theme' IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organizations
      SET settings = settings #- '{theme}'
    `);
  }
}
