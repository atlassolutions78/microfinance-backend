import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves the teller variance accounts (57040001, 57040002) under the correct
 * parent header (5704 — Écarts de caisse) instead of 5703 (Caisse guichet).
 *
 * Also corrects their account type from ASSET to EXPENSE so that:
 *   - Cash deficits (debit on variance)  → recorded as an expense
 *   - Cash surpluses (credit on variance) → contra-expense (reduces the balance)
 */
export class FixVarianceCoaParent1775500000000 implements MigrationInterface {
  name = 'FixVarianceCoaParent1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE chart_of_accounts
       SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '5704'),
           type      = 'EXPENSE'::"public"."accounting_account_type_enum"
       WHERE code IN ('57040001', '57040002')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE chart_of_accounts
       SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '5703'),
           type      = 'ASSET'::"public"."accounting_account_type_enum"
       WHERE code IN ('57040001', '57040002')`,
    );
  }
}
