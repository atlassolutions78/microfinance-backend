import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignatureDocumentType1774200000000 implements MigrationInterface {
  name = 'AddSignatureDocumentType1774200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."client_documents_document_type_enum" ADD VALUE IF NOT EXISTS 'SIGNATURE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values.
    // To roll back, recreate the type without SIGNATURE and migrate the column.
  }
}
