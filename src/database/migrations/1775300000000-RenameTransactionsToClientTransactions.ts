import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTransactionsToClientTransactions1775300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" RENAME TO "client_transactions"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "client_transactions" RENAME TO "transactions"`,
    );
  }
}
