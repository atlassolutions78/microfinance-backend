import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactToOrganizationProfiles1774900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_profiles"
        ADD COLUMN IF NOT EXISTS "phone"        text,
        ADD COLUMN IF NOT EXISTS "email"        text,
        ADD COLUMN IF NOT EXISTS "province"     text,
        ADD COLUMN IF NOT EXISTS "municipality" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization_profiles"
        DROP COLUMN IF EXISTS "phone",
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "province",
        DROP COLUMN IF EXISTS "municipality"
    `);
  }
}
