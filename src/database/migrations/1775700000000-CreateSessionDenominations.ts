import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionDenominations1775700000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE denomination_type_enum AS ENUM (
          'FLOAT_APPROVAL',
          'EOD_DECLARATION'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session_denominations (
        id              UUID          NOT NULL DEFAULT gen_random_uuid(),
        session_id      UUID          NOT NULL,
        type            denomination_type_enum NOT NULL,
        currency        transactions_currency_enum NOT NULL,
        denomination    INTEGER       NOT NULL,
        quantity        INTEGER       NOT NULL,
        subtotal        NUMERIC(18,4) NOT NULL,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT PK_session_denominations PRIMARY KEY (id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_session_denominations_session_id
        ON session_denominations (session_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS IDX_session_denominations_session_id;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS session_denominations;`);
    await queryRunner.query(`DROP TYPE IF EXISTS denomination_type_enum;`);
  }
}
