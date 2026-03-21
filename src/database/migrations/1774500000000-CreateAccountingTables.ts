import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountingTables1774500000000 implements MigrationInterface {
  name = 'CreateAccountingTables1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Chart of accounts ──────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."accounting_account_type_enum" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chart_of_accounts" (
        "id"        uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "code"      varchar       NOT NULL,
        "name"      varchar       NOT NULL,
        "type"      "public"."accounting_account_type_enum" NOT NULL,
        "currency"  "public"."transactions_currency_enum"  NOT NULL,
        "branch_id" uuid          NOT NULL,
        "is_active" boolean       NOT NULL DEFAULT true,
        CONSTRAINT "UQ_chart_of_accounts_code_branch_currency" UNIQUE ("code", "branch_id", "currency"),
        CONSTRAINT "PK_chart_of_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chart_of_accounts_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id")
      )`,
    );

    // ── Journal entries ────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."journal_operation_type_enum" AS ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FEE_PENALTY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "journal_entries" (
        "id"             uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "reference"      varchar       NOT NULL,
        "operation_type" "public"."journal_operation_type_enum" NOT NULL,
        "branch_id"      uuid          NOT NULL,
        "performed_by"   uuid          NOT NULL,
        "description"    text,
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_journal_entries_reference" UNIQUE ("reference"),
        CONSTRAINT "PK_journal_entries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_journal_entries_branch"    FOREIGN KEY ("branch_id")    REFERENCES "branches"("id"),
        CONSTRAINT "FK_journal_entries_performer" FOREIGN KEY ("performed_by") REFERENCES "users"("id")
      )`,
    );

    // ── Journal lines ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."journal_line_side_enum" AS ENUM('DEBIT', 'CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "journal_lines" (
        "id"               uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "journal_entry_id" uuid          NOT NULL,
        "account_id"       uuid          NOT NULL,
        "side"             "public"."journal_line_side_enum" NOT NULL,
        "amount"           numeric(18,4) NOT NULL,
        "currency"         "public"."transactions_currency_enum" NOT NULL,
        CONSTRAINT "PK_journal_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_journal_lines_entry"   FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_journal_lines_account" FOREIGN KEY ("account_id")       REFERENCES "chart_of_accounts"("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "journal_lines"`);
    await queryRunner.query(`DROP TYPE "public"."journal_line_side_enum"`);
    await queryRunner.query(`DROP TABLE "journal_entries"`);
    await queryRunner.query(`DROP TYPE "public"."journal_operation_type_enum"`);
    await queryRunner.query(`DROP TABLE "chart_of_accounts"`);
    await queryRunner.query(
      `DROP TYPE "public"."accounting_account_type_enum"`,
    );
  }
}
