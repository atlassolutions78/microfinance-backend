import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAccountsTables1774300000000 implements MigrationInterface {
  name = 'CreateAccountsTables1774300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."accounts_account_type_enum" AS ENUM('SAVINGS', 'CHECKING', 'BUSINESS_CURRENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."accounts_currency_enum" AS ENUM('USD', 'FC')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."accounts_status_enum" AS ENUM('ACTIVE', 'SUSPENDED', 'CLOSED')`,
    );
    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "account_number" text NOT NULL,
        "client_id"      uuid NOT NULL,
        "branch_id"      uuid NOT NULL,
        "account_type"   "public"."accounts_account_type_enum" NOT NULL,
        "currency"       "public"."accounts_currency_enum" NOT NULL,
        "status"         "public"."accounts_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "balance"        numeric(18,2) NOT NULL DEFAULT 0,
        "opened_by"      uuid NOT NULL,
        "created_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_accounts_account_number" UNIQUE ("account_number"),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."account_sequences_type_enum" AS ENUM('SAVINGS', 'CHECKING', 'BUSINESS_CURRENT')`,
    );
    await queryRunner.query(`
      CREATE TABLE "account_sequences" (
        "type"     "public"."account_sequences_type_enum" NOT NULL,
        "last_seq" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_account_sequences" PRIMARY KEY ("type")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_accounts_client_id"
       FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_accounts_branch_id"
       FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" ADD CONSTRAINT "FK_accounts_opened_by"
       FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_opened_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_branch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "accounts" DROP CONSTRAINT "FK_accounts_client_id"`,
    );
    await queryRunner.query(`DROP TABLE "account_sequences"`);
    await queryRunner.query(
      `DROP TYPE "public"."account_sequences_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TYPE "public"."accounts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."accounts_currency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."accounts_account_type_enum"`);
  }
}
