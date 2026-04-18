import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionNumberToTellerSessions1776000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add as nullable first so existing rows don't violate the NOT NULL constraint
    await queryRunner.query(`
      ALTER TABLE teller_sessions
        ADD COLUMN session_number TEXT NULL
    `);

    // Backfill any existing rows with a legacy placeholder derived from the UUID
    await queryRunner.query(`
      UPDATE teller_sessions
        SET session_number = 'SES-LEGACY-' || UPPER(SUBSTRING(id::text, 1, 8))
        WHERE session_number IS NULL
    `);

    // Now enforce NOT NULL and UNIQUE
    await queryRunner.query(`
      ALTER TABLE teller_sessions
        ALTER COLUMN session_number SET NOT NULL,
        ADD CONSTRAINT teller_sessions_session_number_unique UNIQUE (session_number)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teller_sessions
        DROP CONSTRAINT IF EXISTS teller_sessions_session_number_unique,
        DROP COLUMN IF EXISTS session_number
    `);
  }
}
