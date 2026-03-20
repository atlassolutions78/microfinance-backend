import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1773996940885 implements MigrationInterface {
    name = 'Migration1773996940885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "organization_profiles" DROP COLUMN "mandatory_signatories"`);
        await queryRunner.query(`ALTER TABLE "organization_profiles" DROP COLUMN "optional_signatories"`);
        await queryRunner.query(`ALTER TYPE "public"."client_documents_document_type_enum" RENAME TO "client_documents_document_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."client_documents_document_type_enum" AS ENUM('PASSPORT_PHOTO', 'ID_DOCUMENT', 'REGISTRATION_DOC', 'OPENING_LETTER', 'BIOMETRIC', 'SIGNATURE')`);
        await queryRunner.query(`ALTER TABLE "client_documents" ALTER COLUMN "document_type" TYPE "public"."client_documents_document_type_enum" USING "document_type"::"text"::"public"."client_documents_document_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."client_documents_document_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."client_documents_document_type_enum_old" AS ENUM('PASSPORT_PHOTO', 'ID_DOCUMENT', 'REGISTRATION_DOC', 'OPENING_LETTER', 'BIOMETRIC')`);
        await queryRunner.query(`ALTER TABLE "client_documents" ALTER COLUMN "document_type" TYPE "public"."client_documents_document_type_enum_old" USING "document_type"::"text"::"public"."client_documents_document_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."client_documents_document_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."client_documents_document_type_enum_old" RENAME TO "client_documents_document_type_enum"`);
        await queryRunner.query(`ALTER TABLE "organization_profiles" ADD "optional_signatories" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "organization_profiles" ADD "mandatory_signatories" integer NOT NULL`);
    }

}
