import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class UserVerificationTokens1748736240000 implements MigrationInterface {
  name = 'UserVerificationTokens1748736240000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN verification_token_hash       text,
        ADD COLUMN verification_token_expires_at timestamptz,
        ADD COLUMN password_reset_token_hash      text,
        ADD COLUMN password_reset_token_expires_at timestamptz
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS verification_token_hash,
        DROP COLUMN IF EXISTS verification_token_expires_at,
        DROP COLUMN IF EXISTS password_reset_token_hash,
        DROP COLUMN IF EXISTS password_reset_token_expires_at
    `);
  }
}
