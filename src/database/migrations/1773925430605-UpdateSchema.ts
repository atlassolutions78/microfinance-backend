import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSchema1773925430605 implements MigrationInterface {
  name = 'UpdateSchema1773925430605';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organization_representative_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO', 'ID_DOCUMENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_representative_documents_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_representative_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "org_representative_id" uuid NOT NULL, "document_type" "public"."organization_representative_documents_document_type_enum" NOT NULL, "file_name" text NOT NULL, "file_url" text NOT NULL, "status" "public"."organization_representative_documents_status_enum" NOT NULL DEFAULT 'PENDING', "rejection_reason" text, "uploaded_by" uuid NOT NULL, "reviewed_by" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_52dbd854ff821b362c934a9a3f8" PRIMARY KEY ("id"))`,
    );
    // organization_profiles_organization_type_enum and organization_profiles table
    // are already created by CreateAllTables1773771287585 — skip to avoid duplicate.
    await queryRunner.query(
      `CREATE TYPE "public"."organization_representatives_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_representatives_marital_status_enum" AS ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_representatives_id_type_enum" AS ENUM('NATIONAL_ID', 'PASSPORT', 'CEPGL_CARD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_representatives_signatory_type_enum" AS ENUM('MANDATORY', 'OPTIONAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_representatives" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "first_name" text NOT NULL, "middle_name" text, "last_name" text NOT NULL, "gender" "public"."organization_representatives_gender_enum", "date_of_birth" date, "place_of_birth" text, "province_of_origin" text, "marital_status" "public"."organization_representatives_marital_status_enum", "profession" text, "id_type" "public"."organization_representatives_id_type_enum", "id_number" text NOT NULL, "province" text NOT NULL, "municipality" text NOT NULL, "neighborhood" text NOT NULL, "street" text NOT NULL, "plot_number" text NOT NULL, "phone" text NOT NULL, "email" text, "signatory_type" "public"."organization_representatives_signatory_type_enum" NOT NULL, "role" text, "created_by" uuid NOT NULL, "updated_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3c7608a51a363671df290f39067" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP COLUMN "responsible_adult_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP COLUMN "responsible_adult_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "gender"`,
    );
    await queryRunner.query(`DROP TYPE "public"."representatives_gender_enum"`);
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "date_of_birth"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "place_of_birth"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "province_of_origin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "marital_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_marital_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "profession"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "province"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "municipality"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "neighborhood"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "street"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "plot_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "signatory_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."representatives_signatory_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "representatives" DROP COLUMN "role"`);
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD "place_of_birth" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD "province_of_origin" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD "email" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD "matriculation_number" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "created_by" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ALTER COLUMN "created_by" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "updated_by" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "code" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "created_by" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."clients_type_enum" RENAME TO "clients_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_type_enum" AS ENUM('INDIVIDUAL', 'ORGANIZATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "type" TYPE "public"."clients_type_enum" USING (CASE "type"::text WHEN 'BUSINESS' THEN 'ORGANIZATION' ELSE "type"::text END)::"public"."clients_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."clients_type_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "organization_profiles" ADD CONSTRAINT "FK_2d92f63ec83b9263e4aaa9c82c1" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_representatives" ADD CONSTRAINT "FK_da170cbe06e5f58a1d0e1fdae75" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_representatives" DROP CONSTRAINT "FK_da170cbe06e5f58a1d0e1fdae75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_profiles" DROP CONSTRAINT "FK_2d92f63ec83b9263e4aaa9c82c1"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."clients_type_enum_old" AS ENUM('INDIVIDUAL', 'BUSINESS')`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ALTER COLUMN "type" TYPE "public"."clients_type_enum_old" USING "type"::"text"::"public"."clients_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."clients_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."clients_type_enum_old" RENAME TO "clients_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "created_by" SET DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ALTER COLUMN "code" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" DROP COLUMN "created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP COLUMN "matriculation_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP COLUMN "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP COLUMN "province_of_origin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" DROP COLUMN "place_of_birth"`,
    );
    await queryRunner.query(`ALTER TABLE "representatives" ADD "role" text`);
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_signatory_type_enum" AS ENUM('MANDATORY', 'OPTIONAL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "signatory_type" "public"."representatives_signatory_type_enum" NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "representatives" ADD "email" text`);
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "phone" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "plot_number" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "street" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "neighborhood" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "municipality" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "province" text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "profession" text`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_marital_status_enum" AS ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "marital_status" "public"."representatives_marital_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "province_of_origin" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "place_of_birth" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "date_of_birth" date`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."representatives_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "representatives" ADD "gender" "public"."representatives_gender_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD "responsible_adult_id" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "individual_profiles" ADD "responsible_adult_name" text`,
    );
    await queryRunner.query(`DROP TABLE "organization_representatives"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_representatives_signatory_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_representatives_id_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_representatives_marital_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_representatives_gender_enum"`,
    );
    await queryRunner.query(`DROP TABLE "organization_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_profiles_organization_type_enum"`,
    );
    await queryRunner.query(
      `DROP TABLE "organization_representative_documents"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_representative_documents_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_representative_documents_document_type_enum"`,
    );
  }
}
