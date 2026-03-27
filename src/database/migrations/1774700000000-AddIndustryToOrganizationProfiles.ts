import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndustryToOrganizationProfiles1774700000000 implements MigrationInterface {
  name = 'AddIndustryToOrganizationProfiles1774700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_profiles" ADD COLUMN "industry" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization_profiles" DROP COLUMN "industry"`,
    );
  }
}
