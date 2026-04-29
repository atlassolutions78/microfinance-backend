import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecipientIdTypeToRemittances1776100000000
  implements MigrationInterface
{
  name = 'AddRecipientIdTypeToRemittances1776100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "remittances"
       ADD COLUMN "recipient_id_type" "public"."individual_profiles_id_type_enum" NOT NULL DEFAULT 'NATIONAL_ID'`,
    );
    // Remove the default — new rows must supply it explicitly
    await queryRunner.query(
      `ALTER TABLE "remittances"
       ALTER COLUMN "recipient_id_type" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "remittances" DROP COLUMN "recipient_id_type"`,
    );
  }
}
