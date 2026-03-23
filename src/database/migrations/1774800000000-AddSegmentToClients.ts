import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSegmentToClients1774800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "segment" text NOT NULL DEFAULT 'RETAIL'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "clients" DROP COLUMN IF EXISTS "segment"
    `);
  }
}
