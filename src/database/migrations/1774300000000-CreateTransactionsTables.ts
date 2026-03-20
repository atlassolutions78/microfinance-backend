import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTransactionsTables1774300000000 implements MigrationInterface {
  name = 'CreateTransactionsTables1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_type_enum" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FEE', 'PENALTY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."transactions_currency_enum" AS ENUM('USD', 'FC')`,
    );
    await queryRunner.query(
      `CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" uuid NOT NULL, "branch_id" uuid NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "amount" numeric(18,4) NOT NULL, "currency" "public"."transactions_currency_enum" NOT NULL, "balance_after" numeric(18,4) NOT NULL, "reference" text NOT NULL, "description" text, "performed_by" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_transactions_reference" UNIQUE ("reference"), CONSTRAINT "PK_transactions" PRIMARY KEY ("id"))`,
    );
    // FK constraints to accounts, branches, and users will be added in a future
    // migration once those tables are finalised (Epic 2 — Accounts module).
    await queryRunner.query(
      `CREATE TABLE "transfers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "debit_transaction_id" uuid NOT NULL, "credit_transaction_id" uuid, "is_internal" boolean NOT NULL, "recipient_name" text, "fee_amount" numeric(18,4) NOT NULL DEFAULT 0, "claim_reference" text, CONSTRAINT "PK_transfers" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_currency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
  }
}
