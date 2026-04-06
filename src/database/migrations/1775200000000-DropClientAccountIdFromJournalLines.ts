import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropClientAccountIdFromJournalLines1775200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "journal_lines" DROP COLUMN IF EXISTS "client_account_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "journal_lines" ADD COLUMN "client_account_id" uuid NULL`,
    );
  }
}
