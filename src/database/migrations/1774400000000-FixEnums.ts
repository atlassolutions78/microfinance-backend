import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEnums1774400000000 implements MigrationInterface {
  name = 'FixEnums1774400000000';

  // Must be false: ALTER TYPE ... ADD VALUE cannot be used in the same
  // transaction as references to the new value. Each statement auto-commits.
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add ORGANIZATION to clients_type_enum (IF NOT EXISTS, PostgreSQL 9.3+)
    await queryRunner.query(
      `ALTER TYPE clients_type_enum ADD VALUE IF NOT EXISTS 'ORGANIZATION'`,
    );

    // 2. Migrate rows that were stored with the old 'BUSINESS' value.
    //    Cast via text so PostgreSQL accepts the comparison across enum versions.
    await queryRunner.query(
      `UPDATE clients SET type = 'ORGANIZATION'::clients_type_enum WHERE type::text = 'BUSINESS'`,
    );

    // 3. Add PENDING to accounts_status_enum
    await queryRunner.query(
      `ALTER TYPE accounts_status_enum ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'ACTIVE'`,
    );

    // 4. Add DORMANT to accounts_status_enum
    await queryRunner.query(
      `ALTER TYPE accounts_status_enum ADD VALUE IF NOT EXISTS 'DORMANT' AFTER 'SUSPENDED'`,
    );

    // 5. Fix the accounts table default — was 'ACTIVE', should be 'PENDING'
    await queryRunner.query(
      `ALTER TABLE accounts ALTER COLUMN status SET DEFAULT 'PENDING'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the column default only; enum values cannot be removed in PostgreSQL
    await queryRunner.query(
      `ALTER TABLE accounts ALTER COLUMN status SET DEFAULT 'ACTIVE'`,
    );
  }
}

