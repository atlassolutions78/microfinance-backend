import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameEnToChartOfAccounts1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" ADD "name_en" varchar NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chart_of_accounts" DROP COLUMN "name_en"`,
    );
  }
}
