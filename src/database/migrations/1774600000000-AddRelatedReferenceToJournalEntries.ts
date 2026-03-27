import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelatedReferenceToJournalEntries1774600000000 implements MigrationInterface {
  name = 'AddRelatedReferenceToJournalEntries1774600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "journal_entries" ADD COLUMN "related_reference" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "journal_entries" DROP COLUMN "related_reference"`,
    );
  }
}
