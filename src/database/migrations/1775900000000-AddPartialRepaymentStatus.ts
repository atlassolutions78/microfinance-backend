import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds PARTIAL to the repayment_status_enum to support partial payments
 * where a borrower pays less than the full installment amount.
 */
export class AddPartialRepaymentStatus1775900000000 implements MigrationInterface {
  name = 'AddPartialRepaymentStatus1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."repayment_status_enum" ADD VALUE IF NOT EXISTS 'PARTIAL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values; recreate the type without PARTIAL.
    await queryRunner.query(`
      ALTER TABLE "loan_repayment_schedules"
        ALTER COLUMN "status" TYPE text
    `);
    await queryRunner.query(`DROP TYPE "public"."repayment_status_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."repayment_status_enum" AS ENUM('PENDING', 'PAID', 'LATE', 'OVERDUE')`,
    );
    await queryRunner.query(`
      ALTER TABLE "loan_repayment_schedules"
        ALTER COLUMN "status" TYPE "public"."repayment_status_enum"
          USING "status"::"public"."repayment_status_enum"
    `);
  }
}
