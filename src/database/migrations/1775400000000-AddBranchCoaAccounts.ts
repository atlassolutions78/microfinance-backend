import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates:
 *   - branch_coa_accounts  — maps a branch to its vault + teller-aggregate COA entries
 *
 * Also adds:
 *   - branch_id column to teller_coa_accounts (links each teller account to its branch)
 */
export class AddBranchCoaAccounts1775400000000 implements MigrationInterface {
  name = 'AddBranchCoaAccounts1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── branch_coa_accounts ────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TABLE "branch_coa_accounts" (
        "id"               uuid         NOT NULL DEFAULT uuid_generate_v4(),
        "branch_id"        uuid         NOT NULL,
        "branch_seq"       integer      NOT NULL,
        "vault_fc_code"    varchar(20)  NOT NULL,
        "vault_usd_code"   varchar(20)  NOT NULL,
        "teller_fc_code"   varchar(20)  NOT NULL,
        "teller_usd_code"  varchar(20)  NOT NULL,
        "vault_fc_coa_id"  uuid         NOT NULL,
        "vault_usd_coa_id" uuid         NOT NULL,
        "teller_fc_coa_id" uuid         NOT NULL,
        "teller_usd_coa_id" uuid        NOT NULL,
        "created_at"       timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_coa_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_coa_accounts_branch_id" UNIQUE ("branch_id")
      )`,
    );

    // ── branch_id on teller_coa_accounts ──────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "teller_coa_accounts"
       ADD COLUMN "branch_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teller_coa_accounts" DROP COLUMN "branch_id"`,
    );
    await queryRunner.query(`DROP TABLE "branch_coa_accounts"`);
  }
}
