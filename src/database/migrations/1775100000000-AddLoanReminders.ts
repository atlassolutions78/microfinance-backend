import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoanReminders1775100000000 implements MigrationInterface {
  name = 'AddLoanReminders1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reminder_sent_at to repayment schedules
    await queryRunner.query(`
      ALTER TABLE "loan_repayment_schedules"
      ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMPTZ NULL
    `);

    // Add transaction_id to loan payments
    await queryRunner.query(`
      ALTER TABLE "loan_payments"
      ADD COLUMN IF NOT EXISTS "transaction_id" UUID NULL
    `);

    // Create enum types for loan reminders
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."reminder_channel_enum" AS ENUM ('EMAIL', 'SMS');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."reminder_status_enum" AS ENUM ('SENT', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Create loan_reminders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_reminders" (
        "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
        "loan_id"       UUID          NOT NULL,
        "schedule_id"   UUID          NOT NULL,
        "channel"       "public"."reminder_channel_enum" NOT NULL,
        "status"        "public"."reminder_status_enum"  NOT NULL,
        "error_message" TEXT          NULL,
        "sent_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_reminders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loan_reminders_loan"
          FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_loan_reminders_schedule"
          FOREIGN KEY ("schedule_id") REFERENCES "loan_repayment_schedules"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_loan_reminders_loan_id"
        ON "loan_reminders" ("loan_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_loan_reminders_schedule_id"
        ON "loan_reminders" ("schedule_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loan_reminders_schedule_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_loan_reminders_loan_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_reminders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."reminder_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."reminder_channel_enum"`);
    await queryRunner.query(`ALTER TABLE "loan_payments" DROP COLUMN IF EXISTS "transaction_id"`);
    await queryRunner.query(`ALTER TABLE "loan_repayment_schedules" DROP COLUMN IF EXISTS "reminder_sent_at"`);
  }
}
