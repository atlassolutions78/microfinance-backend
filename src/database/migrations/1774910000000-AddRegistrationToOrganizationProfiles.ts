import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegistrationToOrganizationProfiles1774910000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_profiles"
        ADD COLUMN IF NOT EXISTS "registration_type"   text,
        ADD COLUMN IF NOT EXISTS "registration_number" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_profiles"
        DROP COLUMN IF EXISTS "registration_type",
        DROP COLUMN IF EXISTS "registration_number"
    `);
  }
}
