import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTellerSessionUniqueDateConstraint1775800000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Dropped for development — allows multiple sessions per teller per day.
    // TODO: restore before production by running the down() migration.
    await queryRunner.query(`
      ALTER TABLE teller_sessions
        DROP CONSTRAINT IF EXISTS "UQ_teller_sessions_teller_date";
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teller_sessions
        ADD CONSTRAINT "UQ_teller_sessions_teller_date"
        UNIQUE (teller_id, date);
    `);
  }
}
