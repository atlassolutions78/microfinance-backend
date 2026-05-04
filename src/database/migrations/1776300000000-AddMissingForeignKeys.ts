import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds FK constraints that were missing from the initial schema.
 * All UUID columns that reference another table now have DB-level enforcement.
 */
export class AddMissingForeignKeys1776300000000 implements MigrationInterface {
  name = 'AddMissingForeignKeys1776300000000';

  private async addFk(qr: QueryRunner, sql: string): Promise<void> {
    await qr.query(`
      DO $$ BEGIN
        ${sql};
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users ─────────────────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_branch_id" FOREIGN KEY ("branch_id") REFERENCES "branches"("id")`,
    );

    // ── clients ───────────────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_branch_id"       FOREIGN KEY ("branch_id")       REFERENCES "branches"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_created_by"      FOREIGN KEY ("created_by")      REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_kyc_reviewed_by" FOREIGN KEY ("kyc_reviewed_by") REFERENCES "users"("id")`,
    );

    // ── client_documents ──────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "client_documents" ADD CONSTRAINT "FK_client_docs_client_id"   FOREIGN KEY ("client_id")   REFERENCES "clients"("id") ON DELETE CASCADE`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "client_documents" ADD CONSTRAINT "FK_client_docs_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "client_documents" ADD CONSTRAINT "FK_client_docs_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")`,
    );

    // ── guardian_documents ────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "guardian_documents" ADD CONSTRAINT "FK_guardian_docs_guardian_id"  FOREIGN KEY ("guardian_id")  REFERENCES "minor_guardians"("guardian_id") ON DELETE CASCADE`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "guardian_documents" ADD CONSTRAINT "FK_guardian_docs_uploaded_by"  FOREIGN KEY ("uploaded_by")  REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "guardian_documents" ADD CONSTRAINT "FK_guardian_docs_reviewed_by"  FOREIGN KEY ("reviewed_by")  REFERENCES "users"("id")`,
    );

    // ── organization_representative_documents ─────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "organization_representative_documents" ADD CONSTRAINT "FK_org_rep_docs_rep_id"      FOREIGN KEY ("org_representative_id") REFERENCES "organization_representatives"("id") ON DELETE CASCADE`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "organization_representative_documents" ADD CONSTRAINT "FK_org_rep_docs_uploaded_by" FOREIGN KEY ("uploaded_by")           REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "organization_representative_documents" ADD CONSTRAINT "FK_org_rep_docs_reviewed_by" FOREIGN KEY ("reviewed_by")           REFERENCES "users"("id")`,
    );

    // ── representative_documents ──────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "representative_documents" ADD CONSTRAINT "FK_rep_docs_rep_id"      FOREIGN KEY ("representative_id") REFERENCES "representatives"("id") ON DELETE CASCADE`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "representative_documents" ADD CONSTRAINT "FK_rep_docs_uploaded_by" FOREIGN KEY ("uploaded_by")       REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "representative_documents" ADD CONSTRAINT "FK_rep_docs_reviewed_by" FOREIGN KEY ("reviewed_by")       REFERENCES "users"("id")`,
    );

    // ── client_transactions ───────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "client_transactions" ADD CONSTRAINT "FK_client_tx_account_id"   FOREIGN KEY ("account_id")  REFERENCES "accounts"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "client_transactions" ADD CONSTRAINT "FK_client_tx_branch_id"    FOREIGN KEY ("branch_id")   REFERENCES "branches"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "client_transactions" ADD CONSTRAINT "FK_client_tx_performed_by" FOREIGN KEY ("performed_by") REFERENCES "users"("id")`,
    );

    // ── transfers ─────────────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_transfers_debit_tx"  FOREIGN KEY ("debit_transaction_id")  REFERENCES "client_transactions"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "transfers" ADD CONSTRAINT "FK_transfers_credit_tx" FOREIGN KEY ("credit_transaction_id") REFERENCES "client_transactions"("id")`,
    );

    // ── loan_documents ────────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "loan_documents" ADD CONSTRAINT "FK_loan_docs_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")`,
    );

    // ── loan_payments ─────────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_loan_payments_recorded_by"   FOREIGN KEY ("recorded_by")   REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_loan_payments_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "client_transactions"("id")`,
    );

    // ── teller_transactions ───────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "teller_transactions" ADD CONSTRAINT "FK_teller_tx_account_id" FOREIGN KEY ("account_id") REFERENCES "accounts"("id")`,
    );

    // ── branch_coa_accounts ───────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "branch_coa_accounts" ADD CONSTRAINT "FK_bca_branch_id"       FOREIGN KEY ("branch_id")       REFERENCES "branches"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "branch_coa_accounts" ADD CONSTRAINT "FK_bca_vault_fc_coa"    FOREIGN KEY ("vault_fc_coa_id")  REFERENCES "chart_of_accounts"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "branch_coa_accounts" ADD CONSTRAINT "FK_bca_vault_usd_coa"   FOREIGN KEY ("vault_usd_coa_id") REFERENCES "chart_of_accounts"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "branch_coa_accounts" ADD CONSTRAINT "FK_bca_teller_fc_coa"   FOREIGN KEY ("teller_fc_coa_id")  REFERENCES "chart_of_accounts"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "branch_coa_accounts" ADD CONSTRAINT "FK_bca_teller_usd_coa"  FOREIGN KEY ("teller_usd_coa_id") REFERENCES "chart_of_accounts"("id")`,
    );

    // ── session_denominations ─────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "session_denominations" ADD CONSTRAINT "FK_session_denoms_session_id" FOREIGN KEY ("session_id") REFERENCES "teller_sessions"("id") ON DELETE CASCADE`,
    );

    // ── remittances ───────────────────────────────────────────────────────────
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_sending_session"   FOREIGN KEY ("sending_session_id")  REFERENCES "teller_sessions"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_sending_teller"    FOREIGN KEY ("sending_teller_id")   REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_sending_branch"    FOREIGN KEY ("sending_branch_id")   REFERENCES "branches"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_receiving_branch"  FOREIGN KEY ("receiving_branch_id") REFERENCES "branches"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_payout_session"    FOREIGN KEY ("payout_session_id")   REFERENCES "teller_sessions"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_payout_teller"     FOREIGN KEY ("payout_teller_id")    REFERENCES "users"("id")`,
    );
    await this.addFk(
      queryRunner,
      `ALTER TABLE "remittances" ADD CONSTRAINT "FK_remittances_cancelled_by"      FOREIGN KEY ("cancelled_by")        REFERENCES "users"("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const drops: [string, string][] = [
      ['remittances',                        'FK_remittances_cancelled_by'],
      ['remittances',                        'FK_remittances_payout_teller'],
      ['remittances',                        'FK_remittances_payout_session'],
      ['remittances',                        'FK_remittances_receiving_branch'],
      ['remittances',                        'FK_remittances_sending_branch'],
      ['remittances',                        'FK_remittances_sending_teller'],
      ['remittances',                        'FK_remittances_sending_session'],
      ['session_denominations',              'FK_session_denoms_session_id'],
      ['branch_coa_accounts',                'FK_bca_teller_usd_coa'],
      ['branch_coa_accounts',                'FK_bca_teller_fc_coa'],
      ['branch_coa_accounts',                'FK_bca_vault_usd_coa'],
      ['branch_coa_accounts',                'FK_bca_vault_fc_coa'],
      ['branch_coa_accounts',                'FK_bca_branch_id'],
      ['teller_transactions',                'FK_teller_tx_account_id'],
      ['loan_payments',                      'FK_loan_payments_transaction_id'],
      ['loan_payments',                      'FK_loan_payments_recorded_by'],
      ['loan_documents',                     'FK_loan_docs_uploaded_by'],
      ['transfers',                          'FK_transfers_credit_tx'],
      ['transfers',                          'FK_transfers_debit_tx'],
      ['client_transactions',                'FK_client_tx_performed_by'],
      ['client_transactions',                'FK_client_tx_branch_id'],
      ['client_transactions',                'FK_client_tx_account_id'],
      ['representative_documents',           'FK_rep_docs_reviewed_by'],
      ['representative_documents',           'FK_rep_docs_uploaded_by'],
      ['representative_documents',           'FK_rep_docs_rep_id'],
      ['organization_representative_documents', 'FK_org_rep_docs_reviewed_by'],
      ['organization_representative_documents', 'FK_org_rep_docs_uploaded_by'],
      ['organization_representative_documents', 'FK_org_rep_docs_rep_id'],
      ['guardian_documents',                 'FK_guardian_docs_reviewed_by'],
      ['guardian_documents',                 'FK_guardian_docs_uploaded_by'],
      ['guardian_documents',                 'FK_guardian_docs_guardian_id'],
      ['client_documents',                   'FK_client_docs_reviewed_by'],
      ['client_documents',                   'FK_client_docs_uploaded_by'],
      ['client_documents',                   'FK_client_docs_client_id'],
      ['clients',                            'FK_clients_kyc_reviewed_by'],
      ['clients',                            'FK_clients_created_by'],
      ['clients',                            'FK_clients_branch_id'],
      ['users',                              'FK_users_branch_id'],
    ];

    for (const [table, constraint] of drops) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}"`,
      );
    }
  }
}
