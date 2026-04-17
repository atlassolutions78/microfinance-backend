import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReferenceSequences1775900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Daily reference sequences for JE / TLR / RMT
    await queryRunner.query(`
      CREATE TABLE reference_sequences (
        branch_id   UUID         NOT NULL,
        type        VARCHAR(10)  NOT NULL,
        date        DATE         NOT NULL,
        last_seq    INTEGER      NOT NULL DEFAULT 0,
        PRIMARY KEY (branch_id, type, date)
      )
    `);

    // Global client number sequence — always a single row (id = 1)
    await queryRunner.query(`
      CREATE TABLE client_sequences (
        id       INTEGER PRIMARY KEY,
        last_seq INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Seed from existing clients so we never re-issue a number already in use
    await queryRunner.query(`
      INSERT INTO client_sequences (id, last_seq)
      SELECT 1, COALESCE(
        MAX(CAST(REPLACE(client_number, 'CL-', '') AS INTEGER)),
        0
      )
      FROM clients
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS reference_sequences`);
    await queryRunner.query(`DROP TABLE IF EXISTS client_sequences`);
  }
}
