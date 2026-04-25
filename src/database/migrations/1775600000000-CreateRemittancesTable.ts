import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates:
 *   - remittance_status_enum   — PENDING | PAID | CANCELLED
 *   - remittances              — one row per inter-branch cash remittance
 *
 * Also inserts the three remittance transit COA entries into chart_of_accounts:
 *   45       — Inter-branch accounts header
 *   4519     — Inter-branch remittance transit header
 *   45191001 — Remittance transit FC  (LIABILITY)
 *   45191002 — Remittance transit USD (LIABILITY)
 *
 * Journal flow:
 *   Leg 1 (send):       DR Teller Cash   / CR 45191001|2
 *   Leg 2 (payout):     DR 45191001|2    / CR Teller Cash
 *   Cancellation:       DR 45191001|2    / CR Teller Cash
 */
export class CreateRemittancesTable1775600000000 implements MigrationInterface {
  name = 'CreateRemittancesTable1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum ───────────────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."remittance_status_enum" AS ENUM(
        'PENDING', 'PAID', 'CANCELLED'
      )`,
    );

    // ── remittances table ──────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "remittances" (
        "id"                   uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "reference"            text          NOT NULL,

        "sending_session_id"   uuid          NOT NULL,
        "sending_teller_id"    uuid          NOT NULL,
        "sending_branch_id"    uuid          NOT NULL,
        "receiving_branch_id"  uuid          NOT NULL,

        "amount"               numeric(18,4) NOT NULL,
        "currency"             "public"."transactions_currency_enum" NOT NULL,

        "recipient_name"       text          NOT NULL,
        "recipient_id_number"  text          NOT NULL,
        "recipient_phone"      text                   NULL,

        "status"               "public"."remittance_status_enum" NOT NULL DEFAULT 'PENDING',

        "payout_session_id"    uuid                   NULL,
        "payout_teller_id"     uuid                   NULL,
        "paid_at"              TIMESTAMP WITH TIME ZONE NULL,

        "cancelled_by"         uuid                   NULL,
        "cancelled_at"         TIMESTAMP WITH TIME ZONE NULL,
        "cancellation_reason"  text                   NULL,

        "created_at"           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_remittances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_remittances_reference" UNIQUE ("reference")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_remittances_receiving_branch_status"
       ON "remittances" ("receiving_branch_id", "status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_remittances_sending_branch"
       ON "remittances" ("sending_branch_id")`,
    );

    // ── COA accounts ──────────────────────────────────────────────────────────
    // NOTE: Commented out to allow migrations to run on fresh database.
    // This data should be inserted by the seed script after users exist.
    /*
    // Find the LIABILITIES root id first
    const liabilitiesRoot = await queryRunner.query(
      `SELECT id FROM chart_of_accounts WHERE code = 'LIABILITIES' LIMIT 1`,
    );
    const liabilitiesId: string = liabilitiesRoot[0].id;

    await queryRunner.query(
      `INSERT INTO chart_of_accounts (id, code, name, name_en, type, parent_id, created_by)
       VALUES
         (uuid_generate_v4(), '45',       'Comptes de liaison inter-agences',      'Inter-branch accounts',                 'LIABILITY', $1, '00000000-0000-0000-0000-000000000000'),
         (uuid_generate_v4(), '4519',     'Transit virements inter-agences',       'Inter-branch remittance transit',       'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '45'),   '00000000-0000-0000-0000-000000000000'),
         (uuid_generate_v4(), '45191001', 'Transit virements inter-agences FC',    'Inter-branch remittance transit FC',    'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '4519'), '00000000-0000-0000-0000-000000000000'),
         (uuid_generate_v4(), '45191002', 'Transit virements inter-agences USD',   'Inter-branch remittance transit USD',   'LIABILITY', (SELECT id FROM chart_of_accounts WHERE code = '4519'), '00000000-0000-0000-0000-000000000000')
       ON CONFLICT (code) DO NOTHING
      `,
      [liabilitiesId],
    );
    */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM chart_of_accounts WHERE code IN ('45191002','45191001','4519','45')`,
    );
    await queryRunner.query(`DROP INDEX "IDX_remittances_sending_branch"`);
    await queryRunner.query(
      `DROP INDEX "IDX_remittances_receiving_branch_status"`,
    );
    await queryRunner.query(`DROP TABLE "remittances"`);
    await queryRunner.query(`DROP TYPE "public"."remittance_status_enum"`);
  }
}
