import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaUpdate1773827363231 implements MigrationInterface {
  name = 'SchemaUpdate1773827363231';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // If CreateAllTables already built the final schema, this migration is a no-op.
    const hasIndividualProfiles = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'individual_profiles'`,
    );
    if (hasIndividualProfiles.length > 0) return;

    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_kyc_verified_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_individual_details_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_business_details_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_guardian_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_created_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP CONSTRAINT IF EXISTS "representatives_client_id_fkey"`,
    );
    // Clear seed data — schema is incompatible with old rows; seed will be re-run after migration
    await queryRunner.query(`TRUNCATE TABLE "representatives"`);
    await queryRunner.query(`TRUNCATE TABLE "clients" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "users" CASCADE`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "address" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO', 'ID_DOCUMENT', 'REGISTRATION_DOC', 'OPENING_LETTER', 'BIOMETRIC')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_documents_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "client_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "document_type" "public"."client_documents_document_type_enum" NOT NULL, "file_name" text NOT NULL, "file_url" text NOT NULL, "status" "public"."client_documents_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "uploaded_by" uuid NOT NULL, "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_783c5526a1962035adec4101c91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representative_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO', 'ID_DOCUMENT', 'REPRESENTATIVE_ID')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representative_documents_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "representative_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "representative_id" uuid NOT NULL, "document_type" "public"."representative_documents_document_type_enum" NOT NULL, "file_name" text NOT NULL, "file_url" text NOT NULL, "status" "public"."representative_documents_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "uploaded_by" uuid NOT NULL, "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f11c01254bb802ce2f8c75a5179" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardian_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO', 'ID_DOCUMENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."guardian_documents_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "guardian_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "guardian_id" uuid NOT NULL, "document_type" "public"."guardian_documents_document_type_enum" NOT NULL, "file_name" text NOT NULL, "file_url" text NOT NULL, "status" "public"."guardian_documents_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "uploaded_by" uuid NOT NULL, "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ae7f23b896b2103c6c63a36de12" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."individual_profiles_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."individual_profiles_marital_status_enum" AS ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."individual_profiles_id_type_enum" AS ENUM('NATIONAL_ID', 'PASSPORT', 'CEPGL_CARD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "individual_profiles" ("client_id" uuid NOT NULL, "first_name" text NOT NULL, "middle_name" text, "last_name" text NOT NULL, "date_of_birth" date NOT NULL, "gender" "public"."individual_profiles_gender_enum" NOT NULL, "nationality" text NOT NULL, "marital_status" "public"."individual_profiles_marital_status_enum" NOT NULL, "profession" text NOT NULL, "province" text NOT NULL, "municipality" text NOT NULL, "neighborhood" text NOT NULL, "street" text NOT NULL, "plot_number" text NOT NULL, "phone" text NOT NULL, "id_type" "public"."individual_profiles_id_type_enum" NOT NULL, "id_number" text NOT NULL, "is_minor" boolean NOT NULL DEFAULT false, "responsible_adult_name" text, "responsible_adult_id" text, CONSTRAINT "PK_fdef233c45023bd51f3002e1835" PRIMARY KEY ("client_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "minor_guardians" ("guardian_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "first_name" text NOT NULL, "middle_name" text, "last_name" text NOT NULL, "id_document_ref" text NOT NULL, CONSTRAINT "PK_c17b5589a4b33717534f11fbb3e" PRIMARY KEY ("guardian_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "business_profiles" ("client_id" uuid NOT NULL, "company_name" text NOT NULL, "mandatory_signatories" integer NOT NULL, "optional_signatories" integer NOT NULL, CONSTRAINT "PK_5f629e15d16b419e7d1b8774b45" PRIMARY KEY ("client_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_key"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "client_type"`);
    await queryRunner.query(`DROP TYPE "public"."client_type_enum"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."client_status_enum"`);
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "kyc_verified_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "kyc_verified_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "kyc_rejection_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "kyc_expiry_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_individual_details_id_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "individual_details_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_business_details_id_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "business_details_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_guardian_id_key"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "guardian_id"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "id_expiry_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "is_primary_signatory"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "branch_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_name" character varying(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "first_name" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "middle_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "last_name" character varying(100) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "last_name" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_type_enum" AS ENUM('INDIVIDUAL', 'BUSINESS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "type" "public"."clients_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "branch_id" uuid NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "kyc_reviewed_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "kyc_reviewed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "kyc_notes" text`);
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "middle_name" text`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "gender" "public"."representatives_gender_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "date_of_birth" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "place_of_birth" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "province_of_origin" text`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_marital_status_enum" AS ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "marital_status" "public"."representatives_marital_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "profession" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "province" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "municipality" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "neighborhood" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "street" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "plot_number" text NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_signatory_type_enum" AS ENUM('MANDATORY', 'OPTIONAL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "signatory_type" "public"."representatives_signatory_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('TELLER', 'LOAN_OFFICER', 'MANAGER', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_client_number_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "client_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "client_number" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "UQ_e7c8f23a739b2341fd687b3e079" UNIQUE ("client_number")`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."kyc_status_enum" RENAME TO "kyc_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_kyc_status_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_UPDATE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "kyc_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "kyc_status" TYPE "public"."clients_kyc_status_enum" USING "kyc_status"::"text"::"public"."clients_kyc_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "kyc_status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."kyc_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "first_name" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "last_name" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."id_type_enum" RENAME TO "id_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_id_type_enum" AS ENUM('NATIONAL_ID', 'PASSPORT', 'CEPGL_CARD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ALTER COLUMN "id_type" TYPE "public"."representatives_id_type_enum" USING "id_type"::"text"::"public"."representatives_id_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."id_type_enum_old" CASCADE`);
    await queryRunner.query(
      `ALTER TABLE "representatives" ALTER COLUMN "id_type" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "id_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "id_number" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "phone" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "email"`,
    );
    await queryRunner.query(`ALTER TABLE "representatives" ADD "email" text`);
    await queryRunner.query(`ALTER TABLE "representatives" DROP COLUMN "role"`);
    await queryRunner.query(`ALTER TABLE "representatives" ADD "role" text`);
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD CONSTRAINT "FK_fdef233c45023bd51f3002e1835" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" ADD CONSTRAINT "FK_86caa63f0db59ff0906b915a72c" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_profiles" ADD CONSTRAINT "FK_5f629e15d16b419e7d1b8774b45" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD CONSTRAINT "FK_c847630094f3c23fdd22bd30f0b" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP CONSTRAINT "FK_c847630094f3c23fdd22bd30f0b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "business_profiles" DROP CONSTRAINT "FK_5f629e15d16b419e7d1b8774b45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" DROP CONSTRAINT "FK_86caa63f0db59ff0906b915a72c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP CONSTRAINT "FK_fdef233c45023bd51f3002e1835"`,
    );
    await queryRunner.query(`ALTER TABLE "representatives" DROP COLUMN "role"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "role" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "email" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "phone" character varying(30) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "id_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "id_number" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ALTER COLUMN "id_type" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."id_type_enum_old" AS ENUM('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'RESIDENCE_PERMIT')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ALTER COLUMN "id_type" TYPE "public"."id_type_enum_old" USING "id_type"::"text"::"public"."id_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_id_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."id_type_enum_old" RENAME TO "id_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "last_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "first_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "first_name" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."kyc_status_enum_old" AS ENUM('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "kyc_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "kyc_status" TYPE "public"."kyc_status_enum_old" USING "kyc_status"::"text"::"public"."kyc_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "kyc_status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "public"."clients_kyc_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."kyc_status_enum_old" RENAME TO "kyc_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP CONSTRAINT "UQ_e7c8f23a739b2341fd687b3e079"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "client_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "client_number" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_client_number_key" UNIQUE ("client_number")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum_old" AS ENUM('TELLER', 'LOAN_OFFICER', 'MANAGER', 'ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "signatory_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_signatory_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "plot_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "street"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "neighborhood"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "municipality"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "province"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "profession"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "marital_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_marital_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "province_of_origin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "place_of_birth"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "date_of_birth"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "gender"`,
    );
    await queryRunner.query(`DROP TYPE "public"."representatives_gender_enum"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "middle_name"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "kyc_notes"`);
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "kyc_reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" DROP COLUMN "kyc_reviewed_by"`,
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "branch_id"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."clients_type_enum"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "middle_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "first_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "branch_id"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "is_primary_signatory" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "id_expiry_date" date NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "guardian_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_guardian_id_key" UNIQUE ("guardian_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "business_details_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_business_details_id_key" UNIQUE ("business_details_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "individual_details_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_individual_details_id_key" UNIQUE ("individual_details_id")`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "kyc_expiry_date" date`);
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "kyc_rejection_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "kyc_verified_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "clients" ADD "kyc_verified_by" uuid`);
    await queryRunner.query(
      `CREATE TYPE "public"."client_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'BLACKLISTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "status" "public"."client_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."client_type_enum" AS ENUM('INDIVIDUAL', 'BUSINESS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD "client_type" "public"."client_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "full_name" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "username" character varying(100) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "users_username_key" UNIQUE ("username")`,
    );
    await queryRunner.query(`DROP TABLE "business_profiles"`);
    await queryRunner.query(`DROP TABLE "minor_guardians"`);
    await queryRunner.query(`DROP TABLE "individual_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."individual_profiles_id_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."individual_profiles_marital_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."individual_profiles_gender_enum"`,
    );
    await queryRunner.query(`DROP TABLE "guardian_documents"`);
    await queryRunner.query(
      `DROP TYPE "public"."guardian_documents_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."guardian_documents_document_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "representative_documents"`);
    await queryRunner.query(
      `DROP TYPE "public"."representative_documents_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representative_documents_document_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "client_documents"`);
    await queryRunner.query(
      `DROP TYPE "public"."client_documents_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."client_documents_document_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD CONSTRAINT "representatives_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_business_details_id_fkey" FOREIGN KEY ("business_details_id") REFERENCES "business_details"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_individual_details_id_fkey" FOREIGN KEY ("individual_details_id") REFERENCES "individual_details"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD CONSTRAINT "clients_kyc_verified_by_fkey" FOREIGN KEY ("kyc_verified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
