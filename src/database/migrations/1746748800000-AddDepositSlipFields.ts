import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepositSlipFields1746748800000 implements MigrationInterface {
  name = 'AddDepositSlipFields1746748800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add DEPOSIT to the denomination_type_enum
    await queryRunner.query(`
      ALTER TYPE "public"."denomination_type_enum" ADD VALUE IF NOT EXISTS 'DEPOSIT'
    `);

    // Add depositor fields to client_transactions
    await queryRunner.query(`
      ALTER TABLE "client_transactions"
        ADD COLUMN IF NOT EXISTS "depositor_name"  varchar NULL,
        ADD COLUMN IF NOT EXISTS "depositor_phone" varchar NULL
    `);

    // Add account_tx_id to session_denominations to link deposit denominations to the transaction
    await queryRunner.query(`
      ALTER TABLE "session_denominations"
        ADD COLUMN IF NOT EXISTS "account_tx_id" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_denominations"
        DROP COLUMN IF EXISTS "account_tx_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "client_transactions"
        DROP COLUMN IF EXISTS "depositor_name",
        DROP COLUMN IF EXISTS "depositor_phone"
    `);
    // PostgreSQL does not support removing enum values — leave denomination_type_enum as-is
  }
}
