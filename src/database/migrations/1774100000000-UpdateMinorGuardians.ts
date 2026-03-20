import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMinorGuardians1774100000000 implements MigrationInterface {
  name = 'UpdateMinorGuardians1774100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" DROP COLUMN IF EXISTS "id_document_ref"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" ADD "id_document_ref" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "minor_guardians" ALTER COLUMN "id_document_ref" DROP DEFAULT`,
    );
  }
}
