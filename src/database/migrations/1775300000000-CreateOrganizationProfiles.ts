import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the organization_profiles table with all columns currently required
 * by OrganizationProfileEntity. This table was originally defined in
 * CreateAllTables but that migration was marked-done without executing.
 * The three subsequent ADD COLUMN migrations used IF EXISTS and silently
 * no-oped, so the table never existed.
 */
export class CreateOrganizationProfiles1775300000000
  implements MigrationInterface
{
  name = 'CreateOrganizationProfiles1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."organization_profiles_organization_type_enum"
          AS ENUM('COMPANY', 'SCHOOL', 'NGO', 'GOVERNMENT', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null; END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_profiles" (
        "client_id"               uuid  NOT NULL,
        "organization_type"       "public"."organization_profiles_organization_type_enum" NOT NULL,
        "organization_type_other" text  NULL,
        "organization_name"       text  NOT NULL,
        "industry"                text  NULL,
        "phone"                   text  NULL,
        "email"                   text  NULL,
        "province"                text  NULL,
        "municipality"            text  NULL,
        "registration_type"       text  NULL,
        "registration_number"     text  NULL,
        CONSTRAINT "PK_organization_profiles" PRIMARY KEY ("client_id"),
        CONSTRAINT "FK_organization_profiles_client"
          FOREIGN KEY ("client_id") REFERENCES "clients"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_profiles"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."organization_profiles_organization_type_enum"`,
    );
  }
}
