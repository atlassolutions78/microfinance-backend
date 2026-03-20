import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchTypeAndRoles1773800000000 implements MigrationInterface {
  name = 'AddBranchTypeAndRoles1773800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- branches: add type, code, phone, is_active ---
    await queryRunner.query(
      `CREATE TYPE "public"."branches_type_enum" AS ENUM('HEAD', 'NORMAL')`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "code" text NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD CONSTRAINT "UQ_branches_code" UNIQUE ("code")`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "type" "public"."branches_type_enum" NOT NULL DEFAULT 'NORMAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "phone" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "created_by" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" ADD COLUMN "updated_by" uuid`,
    );

    // --- users: rename MANAGER → BRANCH_MANAGER, add HQ_MANAGER ---
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME VALUE 'MANAGER' TO 'BRANCH_MANAGER'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" ADD VALUE 'HQ_MANAGER'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- branches: remove added columns ---
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "updated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP CONSTRAINT "UQ_branches_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "branches" DROP COLUMN "type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."branches_type_enum"`,
    );

    // --- users: rename BRANCH_MANAGER back to MANAGER ---
    // Note: HQ_MANAGER cannot be removed from a PostgreSQL enum without
    // recreating the type. Ensure no rows use HQ_MANAGER before rolling back.
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME VALUE 'BRANCH_MANAGER' TO 'MANAGER'`,
    );
  }
}
