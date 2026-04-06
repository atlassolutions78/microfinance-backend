import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorAccountingSchema1774700000000
  implements MigrationInterface
{
  name = 'RefactorAccountingSchema1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure the transactions table exists — it may have been marked-as-run
    // without actually executing (mark-migrations bootstrap pattern).
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."transactions_type_enum" AS ENUM(
          'DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT',
          'LOAN_DISBURSEMENT','LOAN_REPAYMENT','FEE','PENALTY'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."transactions_currency_enum" AS ENUM('USD','FC');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transactions" (
        "id"            uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "account_id"    uuid          NOT NULL,
        "branch_id"     uuid          NOT NULL,
        "type"          "public"."transactions_type_enum"     NOT NULL,
        "amount"        numeric(18,4) NOT NULL,
        "currency"      "public"."transactions_currency_enum" NOT NULL,
        "balance_after" numeric(18,4) NOT NULL,
        "reference"     text          NOT NULL,
        "description"   text,
        "performed_by"  uuid          NOT NULL,
        "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_transactions_reference" UNIQUE ("reference"),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transfers" (
        "id"                    uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "debit_transaction_id"  uuid          NOT NULL,
        "credit_transaction_id" uuid,
        "is_internal"           boolean       NOT NULL,
        "recipient_name"        text,
        "fee_amount"            numeric(18,4) NOT NULL DEFAULT 0,
        "claim_reference"       text,
        CONSTRAINT "PK_transfers" PRIMARY KEY ("id")
      )
    `);

    // Drop existing accounting tables (dev environment — all data is re-seeded)
    await queryRunner.query(`TRUNCATE TABLE "journal_lines" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "journal_entries" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "chart_of_accounts" CASCADE`);

    // ── Drop old columns / constraints from chart_of_accounts ──────────────────
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "FK_chart_of_accounts_branch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "UQ_chart_of_accounts_code_branch_currency"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN "branch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN "currency"`,
    );

    // ── Add new columns to chart_of_accounts ───────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD COLUMN "parent_id" uuid REFERENCES "chart_of_accounts"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD COLUMN "created_by" uuid NOT NULL REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD COLUMN "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "UQ_chart_of_accounts_code" UNIQUE ("code")`,
    );

    // ── Refactor journal_entries ───────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN "operation_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN "related_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" RENAME COLUMN "performed_by" TO "created_by"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."journal_entry_status_enum" AS ENUM('DRAFT', 'POSTED', 'REVERSED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "status" "public"."journal_entry_status_enum" NOT NULL DEFAULT 'POSTED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "reversal_of" uuid REFERENCES "journal_entries"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "posted_by" uuid REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "posted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "transaction_id" uuid REFERENCES "transactions"("id")`,
    );

    // ── Refactor journal_lines ─────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN "side"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN "amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "debit" numeric(18,4) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "credit" numeric(18,4) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "client_account_id" uuid REFERENCES "accounts"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "description" text`,
    );

    // ── Drop unused enums ──────────────────────────────────────────────────────
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."journal_operation_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."journal_line_side_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore journal_lines
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN IF EXISTS "description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN IF EXISTS "client_account_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN IF EXISTS "credit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN IF EXISTS "debit"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."journal_line_side_enum" AS ENUM('DEBIT', 'CREDIT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "side" "public"."journal_line_side_enum" NOT NULL DEFAULT 'DEBIT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "amount" numeric(18,4) NOT NULL DEFAULT 0`,
    );

    // Restore journal_entries
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "transaction_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "posted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "posted_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "reversal_of"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."journal_entry_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" RENAME COLUMN "created_by" TO "performed_by"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."journal_operation_type_enum" AS ENUM('DEPOSIT','WITHDRAWAL','TRANSFER','LOAN_DISBURSEMENT','LOAN_REPAYMENT','FEE_PENALTY')`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "operation_type" "public"."journal_operation_type_enum" NOT NULL DEFAULT 'DEPOSIT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "related_reference" varchar`,
    );

    // Restore chart_of_accounts
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP CONSTRAINT IF EXISTS "UQ_chart_of_accounts_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN IF EXISTS "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN IF EXISTS "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN IF EXISTS "created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN IF EXISTS "parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD COLUMN "currency" "public"."transactions_currency_enum" NOT NULL DEFAULT 'USD'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD COLUMN "branch_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "UQ_chart_of_accounts_code_branch_currency" UNIQUE ("code", "branch_id", "currency")`,
    );
  }
}
