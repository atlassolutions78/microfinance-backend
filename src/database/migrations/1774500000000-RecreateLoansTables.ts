import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the old loans table (created by the original bootstrap migration with
 * the legacy INDIVIDUAL/GROUP/EMERGENCY loan types) and recreates it with the
 * new product catalogue: SALARY_ADVANCE, PERSONAL_LOAN, OVERDRAFT.
 *
 * Also creates the supporting tables:
 *   - loan_sequences          (per-year human-readable number counter)
 *   - loan_repayment_schedules
 *   - loan_payments
 *   - loan_penalties
 *   - loan_documents
 */
export class RecreateLoansTables1774500000000 implements MigrationInterface {
  name = 'RecreateLoansTables1774500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ------------------------------------------------------------------
    // 1. Drop the old loans table and its stale enum types
    // ------------------------------------------------------------------
    await queryRunner.query(`DROP TABLE IF EXISTS "loans" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loan_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loan_type_enum"`);

    // ------------------------------------------------------------------
    // 2. New enum types
    // ------------------------------------------------------------------
    await queryRunner.query(
      `CREATE TYPE "public"."loans_type_enum" AS ENUM('SALARY_ADVANCE', 'PERSONAL_LOAN', 'OVERDRAFT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loans_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED', 'DEFAULTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."repayment_status_enum" AS ENUM('PENDING', 'PAID', 'LATE', 'OVERDUE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loan_document_type_enum" AS ENUM('MOU', 'COMMITMENT_LETTER', 'REQUEST_LETTER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."loan_currency_enum" AS ENUM('USD', 'FC')`,
    );

    // ------------------------------------------------------------------
    // 3. loans
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loan_number"         text NOT NULL,
        "client_id"           uuid NOT NULL,
        "account_id"          uuid NOT NULL,
        "branch_id"           uuid NOT NULL,
        "type"                "public"."loans_type_enum" NOT NULL,
        "currency"            "public"."loan_currency_enum" NOT NULL,
        "principal_amount"    numeric(18,2) NOT NULL,
        "outstanding_balance" numeric(18,2) NOT NULL DEFAULT 0,
        "interest_rate"       numeric(8,6) NOT NULL,
        "term_months"         integer NOT NULL,
        "form_fee"            numeric(18,2) NOT NULL DEFAULT 0,
        "purpose"             text,
        "status"              "public"."loans_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason"    text,
        "applied_by"          uuid NOT NULL,
        "reviewed_by"         uuid,
        "reviewed_at"         TIMESTAMP WITH TIME ZONE,
        "disbursed_at"        TIMESTAMP WITH TIME ZONE,
        "disbursed_by"        uuid,
        "closed_at"           TIMESTAMP WITH TIME ZONE,
        "created_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_loans_loan_number" UNIQUE ("loan_number"),
        CONSTRAINT "PK_loans" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_client_id"
       FOREIGN KEY ("client_id") REFERENCES "clients"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_account_id"
       FOREIGN KEY ("account_id") REFERENCES "accounts"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_branch_id"
       FOREIGN KEY ("branch_id") REFERENCES "branches"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_applied_by"
       FOREIGN KEY ("applied_by") REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_reviewed_by"
       FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loans" ADD CONSTRAINT "FK_loans_disbursed_by"
       FOREIGN KEY ("disbursed_by") REFERENCES "users"("id")`,
    );

    // ------------------------------------------------------------------
    // 4. loan_sequences
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "loan_sequences" (
        "year"     integer NOT NULL,
        "last_seq" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_loan_sequences" PRIMARY KEY ("year")
      )
    `);

    // ------------------------------------------------------------------
    // 5. loan_repayment_schedules
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "loan_repayment_schedules" (
        "id"                  uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"             uuid NOT NULL,
        "installment_number"  integer NOT NULL,
        "due_date"            date NOT NULL,
        "principal_amount"    numeric(18,2) NOT NULL,
        "interest_amount"     numeric(18,2) NOT NULL,
        "total_amount"        numeric(18,2) NOT NULL,
        "paid_amount"         numeric(18,2) NOT NULL DEFAULT 0,
        "status"              "public"."repayment_status_enum" NOT NULL DEFAULT 'PENDING',
        "paid_at"             TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_loan_repayment_schedules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "loan_repayment_schedules" ADD CONSTRAINT "FK_schedules_loan_id"
       FOREIGN KEY ("loan_id") REFERENCES "loans"("id")`,
    );

    // ------------------------------------------------------------------
    // 6. loan_payments
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "loan_payments" (
        "id"           uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"      uuid NOT NULL,
        "schedule_id"  uuid,
        "amount"       numeric(18,2) NOT NULL,
        "currency"     "public"."loan_currency_enum" NOT NULL,
        "payment_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "recorded_by"  uuid NOT NULL,
        "notes"        text,
        "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_payments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_payments_loan_id"
       FOREIGN KEY ("loan_id") REFERENCES "loans"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_payments" ADD CONSTRAINT "FK_payments_schedule_id"
       FOREIGN KEY ("schedule_id") REFERENCES "loan_repayment_schedules"("id")`,
    );

    // ------------------------------------------------------------------
    // 7. loan_penalties
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "loan_penalties" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"        uuid NOT NULL,
        "schedule_id"    uuid NOT NULL,
        "penalty_rate"   numeric(5,4) NOT NULL,
        "penalty_amount" numeric(18,2) NOT NULL,
        "applied_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_penalties" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "loan_penalties" ADD CONSTRAINT "FK_penalties_loan_id"
       FOREIGN KEY ("loan_id") REFERENCES "loans"("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "loan_penalties" ADD CONSTRAINT "FK_penalties_schedule_id"
       FOREIGN KEY ("schedule_id") REFERENCES "loan_repayment_schedules"("id")`,
    );

    // ------------------------------------------------------------------
    // 8. loan_documents
    // ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "loan_documents" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"       uuid NOT NULL,
        "document_type" "public"."loan_document_type_enum" NOT NULL,
        "file_name"     text NOT NULL,
        "file_url"      text NOT NULL,
        "uploaded_by"   uuid NOT NULL,
        "uploaded_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_documents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "loan_documents" ADD CONSTRAINT "FK_loan_documents_loan_id"
       FOREIGN KEY ("loan_id") REFERENCES "loans"("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_penalties"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_repayment_schedules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loan_sequences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "loans"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loan_document_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loan_currency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."repayment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loans_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."loans_type_enum"`);
  }
}
