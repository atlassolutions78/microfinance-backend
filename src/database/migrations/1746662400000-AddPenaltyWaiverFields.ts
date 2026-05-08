import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPenaltyWaiverFields1746662400000 implements MigrationInterface {
  name = 'AddPenaltyWaiverFields1746662400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_penalties"
        ADD COLUMN IF NOT EXISTS "waived_amount" numeric(18, 2)    NULL,
        ADD COLUMN IF NOT EXISTS "waived_by"     uuid               NULL,
        ADD COLUMN IF NOT EXISTS "waived_at"     timestamptz        NULL,
        ADD COLUMN IF NOT EXISTS "waived_reason" text               NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "loan_penalties"
        DROP COLUMN IF EXISTS "waived_amount",
        DROP COLUMN IF EXISTS "waived_by",
        DROP COLUMN IF EXISTS "waived_at",
        DROP COLUMN IF EXISTS "waived_reason"
    `);
  }
}
