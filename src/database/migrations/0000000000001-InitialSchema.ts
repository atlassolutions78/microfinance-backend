import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration — represents the complete database schema as of 2026-04-29.
 * Squashes all previous migrations into one file.
 * New schema changes after this date should be added as separate migration files.
 */
export class InitialSchema0000000000001 implements MigrationInterface {
  name = 'InitialSchema0000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Enums ─────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."branches_type_enum" AS ENUM('HEAD','NORMAL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('TELLER','LOAN_OFFICER','BRANCH_MANAGER','ADMIN','HQ_MANAGER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."clients_type_enum" AS ENUM('INDIVIDUAL','ORGANIZATION');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."clients_kyc_status_enum" AS ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED','REQUIRES_UPDATE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."individual_profiles_gender_enum" AS ENUM('MALE','FEMALE','OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."individual_profiles_marital_status_enum" AS ENUM('SINGLE','MARRIED','DIVORCED','WIDOWED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."individual_profiles_id_type_enum" AS ENUM('NATIONAL_ID','PASSPORT','CEPGL_CARD');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_profiles_organization_type_enum" AS ENUM('COMPANY','SCHOOL','NGO','GOVERNMENT','OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_representatives_gender_enum" AS ENUM('MALE','FEMALE','OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_representatives_marital_status_enum" AS ENUM('SINGLE','MARRIED','DIVORCED','WIDOWED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_representatives_id_type_enum" AS ENUM('NATIONAL_ID','PASSPORT','CEPGL_CARD');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_representatives_signatory_type_enum" AS ENUM('MANDATORY','OPTIONAL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."representatives_id_type_enum" AS ENUM('NATIONAL_ID','PASSPORT','CEPGL_CARD');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."client_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO','ID_DOCUMENT','REGISTRATION_DOC','OPENING_LETTER','BIOMETRIC','SIGNATURE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."client_documents_status_enum" AS ENUM('PENDING','ACCEPTED','REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."guardian_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO','ID_DOCUMENT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."guardian_documents_status_enum" AS ENUM('PENDING','ACCEPTED','REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_representative_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO','ID_DOCUMENT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_representative_documents_status_enum" AS ENUM('PENDING','ACCEPTED','REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."representative_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO','ID_DOCUMENT','REPRESENTATIVE_ID');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."representative_documents_status_enum" AS ENUM('PENDING','ACCEPTED','REJECTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."accounts_account_type_enum" AS ENUM('SAVINGS','CHECKING','BUSINESS_CURRENT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."accounts_currency_enum" AS ENUM('USD','FC');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."accounts_status_enum" AS ENUM('PENDING','ACTIVE','SUSPENDED','DORMANT','CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."account_sequences_type_enum" AS ENUM('SAVINGS','CHECKING','BUSINESS_CURRENT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."accounting_account_type_enum" AS ENUM('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."journal_entry_status_enum" AS ENUM('DRAFT','POSTED','REVERSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."transactions_currency_enum" AS ENUM('USD','FC');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."transactions_type_enum" AS ENUM('DEPOSIT','WITHDRAWAL','TRANSFER_IN','TRANSFER_OUT','LOAN_DISBURSEMENT','LOAN_REPAYMENT','FEE','PENALTY');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."loans_type_enum" AS ENUM('SALARY_ADVANCE','PERSONAL_LOAN','OVERDRAFT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."loan_currency_enum" AS ENUM('USD','FC');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."loans_status_enum" AS ENUM('PENDING','APPROVED','REJECTED','ACTIVE','CLOSED','DEFAULTED','WATCH','SUBSTANDARD','DOUBTFUL','LOSS','WRITE_OFF');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."loan_repayment_schedules_status_enum" AS ENUM('PENDING','PAID');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."repayment_status_enum" AS ENUM('PENDING','PAID','LATE','OVERDUE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."loan_document_type_enum" AS ENUM('MOU','COMMITMENT_LETTER','REQUEST_LETTER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."reminder_channel_enum" AS ENUM('EMAIL','SMS');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."reminder_status_enum" AS ENUM('SENT','FAILED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."teller_session_status_enum" AS ENUM('REQUESTED','APPROVED','OPEN','PENDING_RECONCILIATION','CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."teller_tx_type_enum" AS ENUM('DEPOSIT','WITHDRAWAL','TRANSFER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."denomination_type_enum" AS ENUM('FLOAT_APPROVAL','EOD_DECLARATION');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."remittance_status_enum" AS ENUM('PENDING','PAID','CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // ── Tables ────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branches" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "name"       TEXT NOT NULL,
        "code"       TEXT NOT NULL,
        "type"       "public"."branches_type_enum" NOT NULL DEFAULT 'NORMAL',
        "address"    TEXT NOT NULL,
        "phone"      TEXT,
        "is_active"  BOOLEAN NOT NULL DEFAULT true,
        "created_by" UUID NOT NULL,
        "updated_by" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branches" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branches_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                   UUID NOT NULL DEFAULT uuid_generate_v4(),
        "branch_id"            UUID,
        "first_name"           VARCHAR(100) NOT NULL,
        "middle_name"          VARCHAR(100),
        "last_name"            VARCHAR(100) NOT NULL,
        "email"                VARCHAR(255) NOT NULL,
        "password_hash"        VARCHAR(255) NOT NULL,
        "role"                 "public"."users_role_enum" NOT NULL,
        "is_active"            BOOLEAN NOT NULL DEFAULT true,
        "must_change_password" BOOLEAN NOT NULL DEFAULT false,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
        "client_number"   TEXT NOT NULL,
        "type"            "public"."clients_type_enum" NOT NULL,
        "kyc_status"      "public"."clients_kyc_status_enum" NOT NULL DEFAULT 'PENDING',
        "segment"         TEXT NOT NULL DEFAULT 'RETAIL',
        "branch_id"       UUID NOT NULL,
        "created_by"      UUID NOT NULL,
        "kyc_reviewed_by" UUID,
        "kyc_reviewed_at" TIMESTAMPTZ,
        "kyc_notes"       TEXT,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_clients" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_e7c8f23a739b2341fd687b3e079" UNIQUE ("client_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_sequences" (
        "id"       INTEGER NOT NULL,
        "last_seq" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "PK_client_sequences" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "individual_profiles" (
        "client_id"             UUID NOT NULL,
        "first_name"            TEXT NOT NULL,
        "middle_name"           TEXT,
        "last_name"             TEXT NOT NULL,
        "date_of_birth"         DATE NOT NULL,
        "place_of_birth"        TEXT,
        "province_of_origin"    TEXT,
        "gender"                "public"."individual_profiles_gender_enum" NOT NULL,
        "nationality"           TEXT NOT NULL,
        "marital_status"        "public"."individual_profiles_marital_status_enum" NOT NULL,
        "profession"            TEXT NOT NULL,
        "province"              TEXT NOT NULL,
        "municipality"          TEXT NOT NULL,
        "neighborhood"          TEXT NOT NULL,
        "street"                TEXT NOT NULL,
        "plot_number"           TEXT NOT NULL,
        "phone"                 TEXT NOT NULL,
        "email"                 TEXT,
        "id_type"               "public"."individual_profiles_id_type_enum" NOT NULL,
        "id_number"             TEXT NOT NULL,
        "matriculation_number"  TEXT,
        "is_minor"              BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_individual_profiles" PRIMARY KEY ("client_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "minor_guardians" (
        "guardian_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "client_id"   UUID NOT NULL,
        "first_name"  TEXT NOT NULL,
        "middle_name" TEXT,
        "last_name"   TEXT NOT NULL,
        CONSTRAINT "PK_minor_guardians" PRIMARY KEY ("guardian_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_profiles" (
        "client_id"               UUID NOT NULL,
        "organization_type"       "public"."organization_profiles_organization_type_enum" NOT NULL,
        "organization_type_other" TEXT,
        "organization_name"       TEXT NOT NULL,
        "industry"                TEXT,
        "phone"                   TEXT,
        "email"                   TEXT,
        "province"                TEXT,
        "municipality"            TEXT,
        "registration_type"       TEXT,
        "registration_number"     TEXT,
        CONSTRAINT "PK_organization_profiles" PRIMARY KEY ("client_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_representatives" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "client_id"         UUID NOT NULL,
        "first_name"        TEXT NOT NULL,
        "middle_name"       TEXT,
        "last_name"         TEXT NOT NULL,
        "gender"            "public"."organization_representatives_gender_enum",
        "date_of_birth"     DATE,
        "place_of_birth"    TEXT,
        "province_of_origin" TEXT,
        "marital_status"    "public"."organization_representatives_marital_status_enum",
        "profession"        TEXT,
        "id_type"           "public"."organization_representatives_id_type_enum",
        "id_number"         TEXT NOT NULL,
        "province"          TEXT NOT NULL,
        "municipality"      TEXT NOT NULL,
        "neighborhood"      TEXT NOT NULL,
        "street"            TEXT NOT NULL,
        "plot_number"       TEXT NOT NULL,
        "phone"             TEXT NOT NULL,
        "email"             TEXT,
        "signatory_type"    "public"."organization_representatives_signatory_type_enum" NOT NULL,
        "role"              TEXT,
        "created_by"        UUID NOT NULL,
        "updated_by"        UUID,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_representatives" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "representatives" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "client_id"   UUID NOT NULL,
        "first_name"  TEXT NOT NULL,
        "middle_name" TEXT,
        "last_name"   TEXT NOT NULL,
        "id_type"     "public"."representatives_id_type_enum",
        "id_number"   TEXT NOT NULL,
        "created_by"  UUID NOT NULL,
        "updated_by"  UUID,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_representatives" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_documents" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "client_id"        UUID NOT NULL,
        "document_type"    "public"."client_documents_document_type_enum" NOT NULL,
        "file_name"        TEXT NOT NULL,
        "file_url"         TEXT NOT NULL,
        "status"           "public"."client_documents_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason" TEXT,
        "uploaded_by"      UUID NOT NULL,
        "reviewed_by"      UUID,
        "reviewed_at"      TIMESTAMPTZ,
        "uploaded_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "guardian_documents" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "guardian_id"      UUID NOT NULL,
        "document_type"    "public"."guardian_documents_document_type_enum" NOT NULL,
        "file_name"        TEXT NOT NULL,
        "file_url"         TEXT NOT NULL,
        "status"           "public"."guardian_documents_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason" TEXT,
        "uploaded_by"      UUID NOT NULL,
        "reviewed_by"      UUID,
        "reviewed_at"      TIMESTAMPTZ,
        "uploaded_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_guardian_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_representative_documents" (
        "id"                    UUID NOT NULL DEFAULT uuid_generate_v4(),
        "org_representative_id" UUID NOT NULL,
        "document_type"         "public"."organization_representative_documents_document_type_enum" NOT NULL,
        "file_name"             TEXT NOT NULL,
        "file_url"              TEXT NOT NULL,
        "status"                "public"."organization_representative_documents_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason"      TEXT,
        "uploaded_by"           UUID NOT NULL,
        "reviewed_by"           UUID,
        "reviewed_at"           TIMESTAMPTZ,
        "uploaded_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_representative_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "representative_documents" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "representative_id" UUID NOT NULL,
        "document_type"     "public"."representative_documents_document_type_enum" NOT NULL,
        "file_name"         TEXT NOT NULL,
        "file_url"          TEXT NOT NULL,
        "status"            "public"."representative_documents_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason"  TEXT,
        "uploaded_by"       UUID NOT NULL,
        "reviewed_by"       UUID,
        "reviewed_at"       TIMESTAMPTZ,
        "uploaded_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_representative_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "account_number" TEXT NOT NULL,
        "client_id"      UUID NOT NULL,
        "branch_id"      UUID NOT NULL,
        "account_type"   "public"."accounts_account_type_enum" NOT NULL,
        "currency"       "public"."accounts_currency_enum" NOT NULL,
        "status"         "public"."accounts_status_enum" NOT NULL DEFAULT 'PENDING',
        "balance"        NUMERIC(18,2) NOT NULL DEFAULT 0,
        "opened_by"      UUID NOT NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_accounts_account_number" UNIQUE ("account_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account_sequences" (
        "type"     "public"."account_sequences_type_enum" NOT NULL,
        "last_seq" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "PK_account_sequences" PRIMARY KEY ("type")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chart_of_accounts" (
        "id"         UUID NOT NULL DEFAULT uuid_generate_v4(),
        "code"       VARCHAR NOT NULL,
        "name"       VARCHAR NOT NULL,
        "name_en"    VARCHAR,
        "type"       "public"."accounting_account_type_enum" NOT NULL,
        "is_active"  BOOLEAN NOT NULL DEFAULT true,
        "parent_id"  UUID,
        "created_by" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chart_of_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_chart_of_accounts_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_transactions" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "account_id"    UUID NOT NULL,
        "branch_id"     UUID NOT NULL,
        "type"          "public"."transactions_type_enum" NOT NULL,
        "amount"        NUMERIC(18,4) NOT NULL,
        "currency"      "public"."transactions_currency_enum" NOT NULL,
        "balance_after" NUMERIC(18,4) NOT NULL,
        "reference"     TEXT NOT NULL,
        "description"   TEXT,
        "performed_by"  UUID NOT NULL,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_transactions_reference" UNIQUE ("reference")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "journal_entries" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "reference"      VARCHAR NOT NULL,
        "branch_id"      UUID NOT NULL,
        "created_by"     UUID NOT NULL,
        "description"    TEXT,
        "status"         "public"."journal_entry_status_enum" NOT NULL DEFAULT 'POSTED',
        "reversal_of"    UUID,
        "posted_by"      UUID,
        "posted_at"      TIMESTAMPTZ,
        "transaction_id" UUID,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_journal_entries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_journal_entries_reference" UNIQUE ("reference")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "journal_lines" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "journal_entry_id" UUID NOT NULL,
        "account_id"       UUID NOT NULL,
        "currency"         "public"."transactions_currency_enum" NOT NULL,
        "debit"            NUMERIC(18,4) NOT NULL DEFAULT 0,
        "credit"           NUMERIC(18,4) NOT NULL DEFAULT 0,
        "description"      TEXT,
        CONSTRAINT "PK_journal_lines" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "transfers" (
        "id"                    UUID NOT NULL DEFAULT uuid_generate_v4(),
        "debit_transaction_id"  UUID NOT NULL,
        "credit_transaction_id" UUID,
        "is_internal"           BOOLEAN NOT NULL,
        "recipient_name"        TEXT,
        "fee_amount"            NUMERIC(18,4) NOT NULL DEFAULT 0,
        "claim_reference"       TEXT,
        CONSTRAINT "PK_transfers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loans" (
        "id"                  UUID NOT NULL DEFAULT uuid_generate_v4(),
        "loan_number"         TEXT NOT NULL,
        "client_id"           UUID NOT NULL,
        "account_id"          UUID NOT NULL,
        "branch_id"           UUID NOT NULL,
        "type"                "public"."loans_type_enum" NOT NULL,
        "currency"            "public"."loan_currency_enum" NOT NULL,
        "principal_amount"    NUMERIC(18,2) NOT NULL,
        "outstanding_balance" NUMERIC(18,2) NOT NULL DEFAULT 0,
        "interest_rate"       NUMERIC(8,6) NOT NULL,
        "term_months"         INTEGER NOT NULL,
        "form_fee"            NUMERIC(18,2) NOT NULL DEFAULT 0,
        "purpose"             TEXT,
        "status"              "public"."loans_status_enum" NOT NULL DEFAULT 'PENDING',
        "rejection_reason"    TEXT,
        "applied_by"          UUID NOT NULL,
        "reviewed_by"         UUID,
        "reviewed_at"         TIMESTAMPTZ,
        "disbursed_at"        TIMESTAMPTZ,
        "disbursed_by"        UUID,
        "closed_at"           TIMESTAMPTZ,
        "late_since"          TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_loans_loan_number" UNIQUE ("loan_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_sequences" (
        "year"     INTEGER NOT NULL,
        "last_seq" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "PK_loan_sequences" PRIMARY KEY ("year")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_repayment_schedules" (
        "id"                  UUID NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"             UUID NOT NULL,
        "installment_number"  INTEGER NOT NULL,
        "due_date"            DATE NOT NULL,
        "principal_amount"    NUMERIC(18,2) NOT NULL,
        "interest_amount"     NUMERIC(18,2) NOT NULL,
        "total_amount"        NUMERIC(18,2) NOT NULL,
        "paid_amount"         NUMERIC(18,2) NOT NULL DEFAULT 0,
        "status"              "public"."loan_repayment_schedules_status_enum" NOT NULL DEFAULT 'PENDING',
        "paid_at"             TIMESTAMPTZ,
        "reminder_sent_at"    TIMESTAMPTZ,
        CONSTRAINT "PK_loan_repayment_schedules" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_payments" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"        UUID NOT NULL,
        "schedule_id"    UUID,
        "transaction_id" UUID,
        "amount"         NUMERIC(18,2) NOT NULL,
        "currency"       "public"."loan_currency_enum" NOT NULL,
        "payment_date"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "recorded_by"    UUID NOT NULL,
        "notes"          TEXT,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_payments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_penalties" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"        UUID NOT NULL,
        "schedule_id"    UUID,
        "penalty_rate"   NUMERIC(5,4) NOT NULL,
        "penalty_amount" NUMERIC(18,2) NOT NULL,
        "applied_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_penalties" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_reminders" (
        "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
        "loan_id"       UUID NOT NULL,
        "schedule_id"   UUID,
        "channel"       "public"."reminder_channel_enum" NOT NULL,
        "status"        "public"."reminder_status_enum" NOT NULL,
        "error_message" TEXT,
        "sent_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_reminders" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "loan_documents" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "loan_id"       UUID NOT NULL,
        "document_type" "public"."loan_document_type_enum" NOT NULL,
        "file_name"     TEXT NOT NULL,
        "file_url"      TEXT NOT NULL,
        "uploaded_by"   UUID NOT NULL,
        "uploaded_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loan_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teller_sessions" (
        "id"                       UUID NOT NULL DEFAULT uuid_generate_v4(),
        "teller_id"                UUID NOT NULL,
        "branch_id"                UUID NOT NULL,
        "session_number"           TEXT NOT NULL,
        "date"                     DATE NOT NULL,
        "status"                   "public"."teller_session_status_enum" NOT NULL DEFAULT 'REQUESTED',
        "requested_amount_fc"      NUMERIC(18,4) NOT NULL DEFAULT 0,
        "requested_amount_usd"     NUMERIC(18,4) NOT NULL DEFAULT 0,
        "approved_amount_fc"       NUMERIC(18,4) NOT NULL DEFAULT 0,
        "approved_amount_usd"      NUMERIC(18,4) NOT NULL DEFAULT 0,
        "approved_by"              UUID,
        "approved_at"              TIMESTAMPTZ,
        "opening_cash_fc"          NUMERIC(18,4) NOT NULL DEFAULT 0,
        "opening_cash_usd"         NUMERIC(18,4) NOT NULL DEFAULT 0,
        "cash_in_fc"               NUMERIC(18,4) NOT NULL DEFAULT 0,
        "cash_in_usd"              NUMERIC(18,4) NOT NULL DEFAULT 0,
        "cash_out_fc"              NUMERIC(18,4) NOT NULL DEFAULT 0,
        "cash_out_usd"             NUMERIC(18,4) NOT NULL DEFAULT 0,
        "declared_closing_cash_fc"  NUMERIC(18,4),
        "declared_closing_cash_usd" NUMERIC(18,4),
        "submitted_at"             TIMESTAMPTZ,
        "reconciled_by"            UUID,
        "reconciled_at"            TIMESTAMPTZ,
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teller_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "teller_sessions_session_number_unique" UNIQUE ("session_number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teller_transactions" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "session_id"  UUID NOT NULL,
        "type"        "public"."teller_tx_type_enum" NOT NULL,
        "amount"      NUMERIC(18,4) NOT NULL,
        "currency"    VARCHAR(3) NOT NULL,
        "account_id"  UUID NOT NULL,
        "reference"   TEXT NOT NULL,
        "description" TEXT,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teller_transactions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branch_coa_accounts" (
        "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
        "branch_id"       UUID NOT NULL,
        "branch_seq"      INTEGER NOT NULL,
        "vault_fc_code"   VARCHAR(20) NOT NULL,
        "vault_usd_code"  VARCHAR(20) NOT NULL,
        "teller_fc_code"  VARCHAR(20) NOT NULL,
        "teller_usd_code" VARCHAR(20) NOT NULL,
        "vault_fc_coa_id"  UUID NOT NULL,
        "vault_usd_coa_id" UUID NOT NULL,
        "teller_fc_coa_id"  UUID NOT NULL,
        "teller_usd_coa_id" UUID NOT NULL,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_coa_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_coa_accounts_branch_id" UNIQUE ("branch_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teller_coa_accounts" (
        "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
        "teller_id"       UUID NOT NULL,
        "branch_id"       UUID,
        "fc_account_code"  VARCHAR(20) NOT NULL,
        "usd_account_code" VARCHAR(20) NOT NULL,
        "fc_coa_id"       UUID NOT NULL,
        "usd_coa_id"      UUID NOT NULL,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_teller_coa_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_teller_coa_accounts_teller" UNIQUE ("teller_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "session_denominations" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "session_id"  UUID NOT NULL,
        "type"        "public"."denomination_type_enum" NOT NULL,
        "currency"    "public"."transactions_currency_enum" NOT NULL,
        "denomination" INTEGER NOT NULL,
        "quantity"    INTEGER NOT NULL,
        "subtotal"    NUMERIC(18,4) NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_denominations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "remittances" (
        "id"                   UUID NOT NULL DEFAULT uuid_generate_v4(),
        "reference"            TEXT NOT NULL,
        "sending_session_id"   UUID NOT NULL,
        "sending_teller_id"    UUID NOT NULL,
        "sending_branch_id"    UUID NOT NULL,
        "receiving_branch_id"  UUID NOT NULL,
        "amount"               NUMERIC(18,4) NOT NULL,
        "currency"             "public"."transactions_currency_enum" NOT NULL,
        "recipient_name"       TEXT NOT NULL,
        "recipient_id_type"    "public"."individual_profiles_id_type_enum" NOT NULL,
        "recipient_id_number"  TEXT NOT NULL,
        "recipient_phone"      TEXT,
        "status"               "public"."remittance_status_enum" NOT NULL DEFAULT 'PENDING',
        "payout_session_id"    UUID,
        "payout_teller_id"     UUID,
        "paid_at"              TIMESTAMPTZ,
        "cancelled_by"         UUID,
        "cancelled_at"         TIMESTAMPTZ,
        "cancellation_reason"  TEXT,
        "created_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remittances" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_remittances_reference" UNIQUE ("reference")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reference_sequences" (
        "branch_id" UUID NOT NULL,
        "type"      VARCHAR(10) NOT NULL,
        "date"      DATE NOT NULL,
        "last_seq"  INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "PK_reference_sequences" PRIMARY KEY ("branch_id","type","date")
      )
    `);

    // ── Foreign Keys ──────────────────────────────────────────────────────────

    await queryRunner.query(`ALTER TABLE "individual_profiles"   ADD CONSTRAINT "FK_fdef233c45023bd51f3002e1835" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "minor_guardians"       ADD CONSTRAINT "FK_86caa63f0db59ff0906b915a72c" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "organization_profiles" ADD CONSTRAINT "FK_5f629e15d16b419e7d1b8774b45" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "organization_profiles" ADD CONSTRAINT "FK_2d92f63ec83b9263e4aaa9c82c1" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "organization_representatives" ADD CONSTRAINT "FK_da170cbe06e5f58a1d0e1fdae75" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "representatives"       ADD CONSTRAINT "FK_c847630094f3c23fdd22bd30f0b" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "accounts"              ADD CONSTRAINT "FK_accounts_client_id"  FOREIGN KEY ("client_id")  REFERENCES "clients"("id")`);
    await queryRunner.query(`ALTER TABLE "accounts"              ADD CONSTRAINT "FK_accounts_branch_id"  FOREIGN KEY ("branch_id")  REFERENCES "branches"("id")`);
    await queryRunner.query(`ALTER TABLE "accounts"              ADD CONSTRAINT "FK_accounts_opened_by"  FOREIGN KEY ("opened_by")  REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "chart_of_accounts"     ADD CONSTRAINT "chart_of_accounts_parent_id_fkey"   FOREIGN KEY ("parent_id")   REFERENCES "chart_of_accounts"("id")`);
    await queryRunner.query(`ALTER TABLE "chart_of_accounts"     ADD CONSTRAINT "chart_of_accounts_created_by_fkey"  FOREIGN KEY ("created_by")  REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "journal_entries"       ADD CONSTRAINT "FK_journal_entries_branch"     FOREIGN KEY ("branch_id")      REFERENCES "branches"("id")`);
    await queryRunner.query(`ALTER TABLE "journal_entries"       ADD CONSTRAINT "FK_journal_entries_performer"  FOREIGN KEY ("created_by")     REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "journal_entries"       ADD CONSTRAINT "journal_entries_posted_by_fkey"     FOREIGN KEY ("posted_by")      REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "journal_entries"       ADD CONSTRAINT "journal_entries_reversal_of_fkey"   FOREIGN KEY ("reversal_of")    REFERENCES "journal_entries"("id")`);
    await queryRunner.query(`ALTER TABLE "journal_entries"       ADD CONSTRAINT "journal_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "client_transactions"("id")`);
    await queryRunner.query(`ALTER TABLE "journal_lines"         ADD CONSTRAINT "FK_journal_lines_entry"   FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "journal_lines"         ADD CONSTRAINT "FK_journal_lines_account" FOREIGN KEY ("account_id")       REFERENCES "chart_of_accounts"("id")`);
    await queryRunner.query(`ALTER TABLE "loans"                 ADD CONSTRAINT "FK_loans_client_id"    FOREIGN KEY ("client_id")   REFERENCES "clients"("id")`);
    await queryRunner.query(`ALTER TABLE "loans"                 ADD CONSTRAINT "FK_loans_account_id"   FOREIGN KEY ("account_id")  REFERENCES "accounts"("id")`);
    await queryRunner.query(`ALTER TABLE "loans"                 ADD CONSTRAINT "FK_loans_branch_id"    FOREIGN KEY ("branch_id")   REFERENCES "branches"("id")`);
    await queryRunner.query(`ALTER TABLE "loans"                 ADD CONSTRAINT "FK_loans_applied_by"   FOREIGN KEY ("applied_by")  REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "loans"                 ADD CONSTRAINT "FK_loans_reviewed_by"  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "loans"                 ADD CONSTRAINT "FK_loans_disbursed_by" FOREIGN KEY ("disbursed_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "loan_repayment_schedules" ADD CONSTRAINT "FK_schedules_loan_id"  FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "loan_payments"         ADD CONSTRAINT "FK_payments_loan_id"     FOREIGN KEY ("loan_id")     REFERENCES "loans"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "loan_payments"         ADD CONSTRAINT "FK_payments_schedule_id" FOREIGN KEY ("schedule_id") REFERENCES "loan_repayment_schedules"("id")`);
    await queryRunner.query(`ALTER TABLE "loan_penalties"        ADD CONSTRAINT "FK_penalties_loan_id"     FOREIGN KEY ("loan_id")     REFERENCES "loans"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "loan_penalties"        ADD CONSTRAINT "FK_penalties_schedule_id" FOREIGN KEY ("schedule_id") REFERENCES "loan_repayment_schedules"("id")`);
    await queryRunner.query(`ALTER TABLE "loan_reminders"        ADD CONSTRAINT "FK_loan_reminders_loan"     FOREIGN KEY ("loan_id")     REFERENCES "loans"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "loan_reminders"        ADD CONSTRAINT "FK_loan_reminders_schedule" FOREIGN KEY ("schedule_id") REFERENCES "loan_repayment_schedules"("id")`);
    await queryRunner.query(`ALTER TABLE "loan_documents"        ADD CONSTRAINT "FK_loan_documents_loan_id"  FOREIGN KEY ("loan_id")     REFERENCES "loans"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "teller_sessions"       ADD CONSTRAINT "FK_teller_sessions_teller"   FOREIGN KEY ("teller_id")   REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "teller_sessions"       ADD CONSTRAINT "FK_teller_sessions_branch"   FOREIGN KEY ("branch_id")   REFERENCES "branches"("id")`);
    await queryRunner.query(`ALTER TABLE "teller_sessions"       ADD CONSTRAINT "FK_teller_sessions_approver" FOREIGN KEY ("approved_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "teller_transactions"   ADD CONSTRAINT "FK_teller_transactions_session" FOREIGN KEY ("session_id") REFERENCES "teller_sessions"("id")`);
    await queryRunner.query(`ALTER TABLE "teller_coa_accounts"   ADD CONSTRAINT "FK_teller_coa_accounts_teller"   FOREIGN KEY ("teller_id")  REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "teller_coa_accounts"   ADD CONSTRAINT "FK_teller_coa_accounts_fc_coa"   FOREIGN KEY ("fc_coa_id")  REFERENCES "chart_of_accounts"("id")`);
    await queryRunner.query(`ALTER TABLE "teller_coa_accounts"   ADD CONSTRAINT "FK_teller_coa_accounts_usd_coa"  FOREIGN KEY ("usd_coa_id") REFERENCES "chart_of_accounts"("id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs first, then tables, then enums
    const fkDrops = [
      `ALTER TABLE "teller_coa_accounts" DROP CONSTRAINT IF EXISTS "FK_teller_coa_accounts_usd_coa"`,
      `ALTER TABLE "teller_coa_accounts" DROP CONSTRAINT IF EXISTS "FK_teller_coa_accounts_fc_coa"`,
      `ALTER TABLE "teller_coa_accounts" DROP CONSTRAINT IF EXISTS "FK_teller_coa_accounts_teller"`,
      `ALTER TABLE "teller_transactions" DROP CONSTRAINT IF EXISTS "FK_teller_transactions_session"`,
      `ALTER TABLE "teller_sessions" DROP CONSTRAINT IF EXISTS "FK_teller_sessions_approver"`,
      `ALTER TABLE "teller_sessions" DROP CONSTRAINT IF EXISTS "FK_teller_sessions_branch"`,
      `ALTER TABLE "teller_sessions" DROP CONSTRAINT IF EXISTS "FK_teller_sessions_teller"`,
      `ALTER TABLE "loan_documents" DROP CONSTRAINT IF EXISTS "FK_loan_documents_loan_id"`,
      `ALTER TABLE "loan_reminders" DROP CONSTRAINT IF EXISTS "FK_loan_reminders_schedule"`,
      `ALTER TABLE "loan_reminders" DROP CONSTRAINT IF EXISTS "FK_loan_reminders_loan"`,
      `ALTER TABLE "loan_penalties" DROP CONSTRAINT IF EXISTS "FK_penalties_schedule_id"`,
      `ALTER TABLE "loan_penalties" DROP CONSTRAINT IF EXISTS "FK_penalties_loan_id"`,
      `ALTER TABLE "loan_payments" DROP CONSTRAINT IF EXISTS "FK_payments_schedule_id"`,
      `ALTER TABLE "loan_payments" DROP CONSTRAINT IF EXISTS "FK_payments_loan_id"`,
      `ALTER TABLE "loan_repayment_schedules" DROP CONSTRAINT IF EXISTS "FK_schedules_loan_id"`,
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_disbursed_by"`,
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_reviewed_by"`,
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_applied_by"`,
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_branch_id"`,
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_account_id"`,
      `ALTER TABLE "loans" DROP CONSTRAINT IF EXISTS "FK_loans_client_id"`,
      `ALTER TABLE "journal_lines" DROP CONSTRAINT IF EXISTS "FK_journal_lines_account"`,
      `ALTER TABLE "journal_lines" DROP CONSTRAINT IF EXISTS "FK_journal_lines_entry"`,
      `ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "journal_entries_transaction_id_fkey"`,
      `ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "journal_entries_reversal_of_fkey"`,
      `ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "journal_entries_posted_by_fkey"`,
      `ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "FK_journal_entries_performer"`,
      `ALTER TABLE "journal_entries" DROP CONSTRAINT IF EXISTS "FK_journal_entries_branch"`,
      `ALTER TABLE "chart_of_accounts" DROP CONSTRAINT IF EXISTS "chart_of_accounts_created_by_fkey"`,
      `ALTER TABLE "chart_of_accounts" DROP CONSTRAINT IF EXISTS "chart_of_accounts_parent_id_fkey"`,
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_accounts_opened_by"`,
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_accounts_branch_id"`,
      `ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_accounts_client_id"`,
      `ALTER TABLE "representatives" DROP CONSTRAINT IF EXISTS "FK_c847630094f3c23fdd22bd30f0b"`,
      `ALTER TABLE "organization_representatives" DROP CONSTRAINT IF EXISTS "FK_da170cbe06e5f58a1d0e1fdae75"`,
      `ALTER TABLE "organization_profiles" DROP CONSTRAINT IF EXISTS "FK_2d92f63ec83b9263e4aaa9c82c1"`,
      `ALTER TABLE "organization_profiles" DROP CONSTRAINT IF EXISTS "FK_5f629e15d16b419e7d1b8774b45"`,
      `ALTER TABLE "minor_guardians" DROP CONSTRAINT IF EXISTS "FK_86caa63f0db59ff0906b915a72c"`,
      `ALTER TABLE "individual_profiles" DROP CONSTRAINT IF EXISTS "FK_fdef233c45023bd51f3002e1835"`,
    ];
    for (const q of fkDrops) await queryRunner.query(q);

    const tables = [
      'reference_sequences','remittances','session_denominations','teller_coa_accounts',
      'branch_coa_accounts','teller_transactions','teller_sessions','loan_documents',
      'loan_reminders','loan_penalties','loan_payments','loan_repayment_schedules',
      'loan_sequences','loans','transfers','journal_lines','journal_entries',
      'client_transactions','chart_of_accounts','account_sequences','accounts',
      'representative_documents','organization_representative_documents','guardian_documents',
      'client_documents','representatives','organization_representatives','minor_guardians',
      'organization_profiles','individual_profiles','client_sequences','clients',
      'users','branches',
    ];
    for (const t of tables) await queryRunner.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);

    const enums = [
      'remittance_status_enum','denomination_type_enum','teller_tx_type_enum',
      'teller_session_status_enum','reminder_status_enum','reminder_channel_enum',
      'loan_document_type_enum','repayment_status_enum','loan_repayment_schedules_status_enum',
      'loans_status_enum','loan_currency_enum','loans_type_enum','transactions_type_enum',
      'transactions_currency_enum','journal_entry_status_enum','accounting_account_type_enum',
      'account_sequences_type_enum','accounts_status_enum','accounts_currency_enum',
      'accounts_account_type_enum','representative_documents_status_enum',
      'representative_documents_document_type_enum','organization_representative_documents_status_enum',
      'organization_representative_documents_document_type_enum','guardian_documents_status_enum',
      'guardian_documents_document_type_enum','client_documents_status_enum',
      'client_documents_document_type_enum','representatives_id_type_enum',
      'organization_representatives_signatory_type_enum','organization_representatives_id_type_enum',
      'organization_representatives_marital_status_enum','organization_representatives_gender_enum',
      'organization_profiles_organization_type_enum','individual_profiles_id_type_enum',
      'individual_profiles_marital_status_enum','individual_profiles_gender_enum',
      'clients_kyc_status_enum','clients_type_enum','users_role_enum','branches_type_enum',
    ];
    for (const e of enums) await queryRunner.query(`DROP TYPE IF EXISTS "public"."${e}"`);
  }
}
