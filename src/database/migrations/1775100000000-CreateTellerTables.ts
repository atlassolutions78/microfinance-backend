import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates:
 *   - teller_sessions        — one per teller per business day
 *   - teller_transactions    — individual transactions within a session
 *   - teller_coa_accounts    — maps a teller user to their FC + USD COA accounts
 *
 * Also inserts the TELLER_VARIANCE COA entries (57040001 / 57040002) used
 * when recording EOD surplus or deficit.
 */
export class CreateTellerTables1775100000000 implements MigrationInterface {
  name = 'CreateTellerTables1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enums ──────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."teller_session_status_enum" AS ENUM(
        'REQUESTED', 'APPROVED', 'OPEN', 'PENDING_RECONCILIATION', 'CLOSED'
      )`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."teller_tx_type_enum" AS ENUM(
        'DEPOSIT', 'WITHDRAWAL', 'TRANSFER'
      )`,
    );

    // ── teller_sessions ────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "teller_sessions" (
        "id"                       uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "teller_id"                uuid          NOT NULL,
        "branch_id"                uuid          NOT NULL,
        "date"                     date          NOT NULL,
        "status"                   "public"."teller_session_status_enum" NOT NULL DEFAULT 'REQUESTED',

        "requested_amount_fc"      numeric(18,4) NOT NULL DEFAULT 0,
        "requested_amount_usd"     numeric(18,4) NOT NULL DEFAULT 0,

        "approved_amount_fc"       numeric(18,4) NOT NULL DEFAULT 0,
        "approved_amount_usd"      numeric(18,4) NOT NULL DEFAULT 0,
        "approved_by"              uuid                   NULL,
        "approved_at"              TIMESTAMP WITH TIME ZONE NULL,

        "opening_cash_fc"          numeric(18,4) NOT NULL DEFAULT 0,
        "opening_cash_usd"         numeric(18,4) NOT NULL DEFAULT 0,
        "cash_in_fc"               numeric(18,4) NOT NULL DEFAULT 0,
        "cash_in_usd"              numeric(18,4) NOT NULL DEFAULT 0,
        "cash_out_fc"              numeric(18,4) NOT NULL DEFAULT 0,
        "cash_out_usd"             numeric(18,4) NOT NULL DEFAULT 0,

        "declared_closing_cash_fc"  numeric(18,4)          NULL,
        "declared_closing_cash_usd" numeric(18,4)          NULL,
        "submitted_at"             TIMESTAMP WITH TIME ZONE NULL,

        "reconciled_by"            uuid                   NULL,
        "reconciled_at"            TIMESTAMP WITH TIME ZONE NULL,

        "created_at"               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_teller_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teller_sessions_teller_date" UNIQUE ("teller_id", "date"),
        CONSTRAINT "FK_teller_sessions_teller"  FOREIGN KEY ("teller_id")  REFERENCES "users"("id"),
        CONSTRAINT "FK_teller_sessions_branch"  FOREIGN KEY ("branch_id")  REFERENCES "branches"("id"),
        CONSTRAINT "FK_teller_sessions_approver" FOREIGN KEY ("approved_by") REFERENCES "users"("id")
      )`,
    );

    // ── teller_transactions ────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "teller_transactions" (
        "id"          uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "session_id"  uuid          NOT NULL,
        "type"        "public"."teller_tx_type_enum" NOT NULL,
        "amount"      numeric(18,4) NOT NULL,
        "currency"    varchar(3)    NOT NULL,
        "account_id"  uuid          NOT NULL,
        "reference"   text          NOT NULL,
        "description" text                   NULL,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_teller_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teller_transactions_session" FOREIGN KEY ("session_id") REFERENCES "teller_sessions"("id")
      )`,
    );

    // ── teller_coa_accounts ────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "teller_coa_accounts" (
        "id"               uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "teller_id"        uuid        NOT NULL,
        "fc_account_code"  varchar(20) NOT NULL,
        "usd_account_code" varchar(20) NOT NULL,
        "fc_coa_id"        uuid        NOT NULL,
        "usd_coa_id"       uuid        NOT NULL,
        "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_teller_coa_accounts"           PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teller_coa_accounts_teller"    UNIQUE ("teller_id"),
        CONSTRAINT "FK_teller_coa_accounts_teller"    FOREIGN KEY ("teller_id")  REFERENCES "users"("id"),
        CONSTRAINT "FK_teller_coa_accounts_fc_coa"    FOREIGN KEY ("fc_coa_id")  REFERENCES "chart_of_accounts"("id"),
        CONSTRAINT "FK_teller_coa_accounts_usd_coa"   FOREIGN KEY ("usd_coa_id") REFERENCES "chart_of_accounts"("id")
      )`,
    );

    // ── TELLER_VARIANCE COA entries ────────────────────────────────────────────
    // These are institution-wide accounts used to record EOD cash variance.
    // They sit under the "Trésorerie" (class 5) group as a suspense account.
    //
    // We insert them only if the chart_of_accounts table already has the
    // generic teller accounts seeded (57030001 / 57030002), using their
    // parent_id so the hierarchy is preserved.
    //
    // NOTE: Commented out to allow migrations to run on fresh database.
    // This data should be inserted by the seed script after users exist.
    /*
    await queryRunner.query(
      `INSERT INTO chart_of_accounts (id, code, name, name_en, type, parent_id, is_active, created_by, created_at, updated_at)
       SELECT
         uuid_generate_v4(),
         v.code,
         v.name,
         v.name_en,
         'ASSET'::"public"."accounting_account_type_enum",
         (SELECT parent_id FROM chart_of_accounts WHERE code = '57030001' LIMIT 1),
         true,
         COALESCE(
           (SELECT id FROM users ORDER BY created_at LIMIT 1),
           '00000000-0000-0000-0000-000000000000'::uuid
         ),
         now(),
         now()
       FROM (VALUES
         ('57040001', 'Écart de caisse Teller (FC)',  'Teller Cash Variance (FC)'),
         ('57040002', 'Écart de caisse Teller (USD)', 'Teller Cash Variance (USD)')
       ) AS v(code, name, name_en)
       WHERE NOT EXISTS (
         SELECT 1 FROM chart_of_accounts WHERE code = v.code
       )`,
    );
    */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM chart_of_accounts WHERE code IN ('57040001', '57040002')`,
    );
    await queryRunner.query(`DROP TABLE "teller_coa_accounts"`);
    await queryRunner.query(`DROP TABLE "teller_transactions"`);
    await queryRunner.query(`DROP TABLE "teller_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."teller_tx_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."teller_session_status_enum"`);
  }
}
