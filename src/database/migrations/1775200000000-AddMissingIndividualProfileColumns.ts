import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingIndividualProfileColumns1775200000000
  implements MigrationInterface
{
  name = 'AddMissingIndividualProfileColumns1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "individual_profiles"
        ADD COLUMN IF NOT EXISTS "place_of_birth"       text NULL,
        ADD COLUMN IF NOT EXISTS "province_of_origin"   text NULL,
        ADD COLUMN IF NOT EXISTS "email"                text NULL,
        ADD COLUMN IF NOT EXISTS "matriculation_number" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "individual_profiles"
        DROP COLUMN IF EXISTS "matriculation_number",
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "province_of_origin",
        DROP COLUMN IF EXISTS "place_of_birth"
    `);
  }
}
