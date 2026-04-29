import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refactors late-loan tracking from installment-level to loan-level:
 *
 * 1. loans.status enum — removes DEFAULTED, adds WATCH/SUBSTANDARD/DOUBTFUL/LOSS/WRITE_OFF
 * 2. loans — adds late_since column
 * 3. loan_repayment_schedules.status enum — removes LATE and OVERDUE (keeps PENDING/PAID)
 * 4. loan_penalties.schedule_id — makes nullable (penalty is now loan-level)
 * 5. loan_reminders.schedule_id — makes nullable (reminder is now loan-level)
 */
export class RefactorLoanLateTracking1776200000000 implements MigrationInterface {
  name = 'RefactorLoanLateTracking1776200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Update loans status enum ───────────────────────────────────────────
    await queryRunner.query(
      `ALTER TYPE "public"."loans_status_enum"
       ADD VALUE IF NOT EXISTS 'WATCH'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."loans_status_enum"
       ADD VALUE IF NOT EXISTS 'SUBSTANDARD'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."loans_status_enum"
       ADD VALUE IF NOT EXISTS 'DOUBTFUL'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."loans_status_enum"
       ADD VALUE IF NOT EXISTS 'LOSS'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."loans_status_enum"
       ADD VALUE IF NOT EXISTS 'WRITE_OFF'`,
    );
    // Note: DEFAULTED cannot be dropped from an enum while the type exists.
    // Existing rows with DEFAULTED = none in production. The value is left in
    // the DB enum but is no longer used by the application.

    // ── 2. Add late_since to loans ────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "loans"
       ADD COLUMN IF NOT EXISTS "late_since" TIMESTAMP WITH TIME ZONE NULL`,
    );

    // ── 3. Simplify repayment schedule status enum ────────────────────────────
    // Migrate any LATE/OVERDUE rows to PENDING before changing the enum
    await queryRunner.query(
      `UPDATE "loan_repayment_schedules"
       SET "status" = 'PENDING'
       WHERE "status" IN ('LATE', 'OVERDUE')`,
    );

    // Rebuild the enum without LATE and OVERDUE
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules"
       ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules"
       ALTER COLUMN "status" TYPE text`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."loan_repayment_schedules_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loan_repayment_schedules_status_enum" AS ENUM('PENDING', 'PAID')`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules"
       ALTER COLUMN "status" TYPE "public"."loan_repayment_schedules_status_enum"
       USING "status"::"public"."loan_repayment_schedules_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules"
       ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );

    // ── 4. Make loan_penalties.schedule_id nullable ───────────────────────────
    await queryRunner.query(
      `ALTER TABLE "loan_penalties"
       ALTER COLUMN "schedule_id" DROP NOT NULL`,
    );

    // ── 5. Make loan_reminders.schedule_id nullable ───────────────────────────
    await queryRunner.query(
      `ALTER TABLE "loan_reminders"
       ALTER COLUMN "schedule_id" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore loan_reminders.schedule_id NOT NULL
    await queryRunner.query(
      `UPDATE "loan_reminders" SET "schedule_id" = '00000000-0000-0000-0000-000000000000' WHERE "schedule_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_reminders" ALTER COLUMN "schedule_id" SET NOT NULL`,
    );

    // Restore loan_penalties.schedule_id NOT NULL
    await queryRunner.query(
      `UPDATE "loan_penalties" SET "schedule_id" = '00000000-0000-0000-0000-000000000000' WHERE "schedule_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_penalties" ALTER COLUMN "schedule_id" SET NOT NULL`,
    );

    // Restore repayment status enum with LATE and OVERDUE
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules" ALTER COLUMN "status" TYPE text`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."loan_repayment_schedules_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loan_repayment_schedules_status_enum" AS ENUM('PENDING', 'PAID', 'LATE', 'OVERDUE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules"
       ALTER COLUMN "status" TYPE "public"."loan_repayment_schedules_status_enum"
       USING "status"::"public"."loan_repayment_schedules_status_enum"`,
    );

    // Remove late_since
    await queryRunner.query(
      `ALTER TABLE "loans" DROP COLUMN IF EXISTS "late_since"`,
    );
  }
}
