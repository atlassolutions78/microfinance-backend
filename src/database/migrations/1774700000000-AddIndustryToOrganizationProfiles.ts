import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndustryToOrganizationProfiles1774700000000 implements MigrationInterface {
  name = 'AddIndustryToOrganizationProfiles1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "organization_profiles" ADD COLUMN IF NOT EXISTS "industry" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "organization_profiles" DROP COLUMN IF EXISTS "industry"`,
    );
  }
}
