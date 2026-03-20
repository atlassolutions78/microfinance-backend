import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAllTables1773771287585 implements MigrationInterface {
  name = 'CreateAllTables1773771287585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('TELLER', 'LOAN_OFFICER', 'MANAGER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "branch_id" uuid, "first_name" character varying(100) NOT NULL, "middle_name" character varying(100), "last_name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" text NOT NULL, "address" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`,
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
      `CREATE TYPE "public"."clients_type_enum" AS ENUM('INDIVIDUAL', 'ORGANIZATION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_kyc_status_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_UPDATE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "clients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_number" text NOT NULL, "type" "public"."clients_type_enum" NOT NULL, "kyc_status" "public"."clients_kyc_status_enum" NOT NULL DEFAULT 'PENDING', "branch_id" uuid NOT NULL, "created_by" uuid NOT NULL, "kyc_reviewed_by" uuid, "kyc_reviewed_at" TIMESTAMP WITH TIME ZONE, "kyc_notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e7c8f23a739b2341fd687b3e079" UNIQUE ("client_number"), CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`,
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
      `CREATE TYPE "public"."organization_profiles_organization_type_enum" AS ENUM('COMPANY', 'SCHOOL', 'NGO', 'GOVERNMENT', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_profiles" ("client_id" uuid NOT NULL, "organization_type" "public"."organization_profiles_organization_type_enum" NOT NULL, "organization_type_other" text, "organization_name" text NOT NULL, "mandatory_signatories" integer NOT NULL, "optional_signatories" integer NOT NULL, CONSTRAINT "PK_5f629e15d16b419e7d1b8774b45" PRIMARY KEY ("client_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_marital_status_enum" AS ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_id_type_enum" AS ENUM('NATIONAL_ID', 'PASSPORT', 'CEPGL_CARD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_signatory_type_enum" AS ENUM('MANDATORY', 'OPTIONAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "representatives" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "first_name" text NOT NULL, "middle_name" text, "last_name" text NOT NULL, "gender" "public"."representatives_gender_enum", "date_of_birth" date, "place_of_birth" text, "province_of_origin" text, "marital_status" "public"."representatives_marital_status_enum", "profession" text, "id_type" "public"."representatives_id_type_enum", "id_number" text NOT NULL, "province" text NOT NULL, "municipality" text NOT NULL, "neighborhood" text NOT NULL, "street" text NOT NULL, "plot_number" text NOT NULL, "phone" text NOT NULL, "email" text, "signatory_type" "public"."representatives_signatory_type_enum" NOT NULL, "role" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_80e9af53802d5e0376d1ae8f68c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD CONSTRAINT "FK_fdef233c45023bd51f3002e1835" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" ADD CONSTRAINT "FK_86caa63f0db59ff0906b915a72c" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_profiles" ADD CONSTRAINT "FK_5f629e15d16b419e7d1b8774b45" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "organization_profiles" DROP CONSTRAINT "FK_5f629e15d16b419e7d1b8774b45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" DROP CONSTRAINT "FK_86caa63f0db59ff0906b915a72c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP CONSTRAINT "FK_fdef233c45023bd51f3002e1835"`,
    );
    await queryRunner.query(`DROP TABLE "representatives"`);
    await queryRunner.query(
      `DROP TYPE "public"."representatives_signatory_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_id_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_marital_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."representatives_gender_enum"`);
    await queryRunner.query(`DROP TABLE "organization_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_profiles_organization_type_enum"`,
    );
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
    await queryRunner.query(`DROP TABLE "clients"`);
    await queryRunner.query(`DROP TYPE "public"."clients_kyc_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."clients_type_enum"`);
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
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
