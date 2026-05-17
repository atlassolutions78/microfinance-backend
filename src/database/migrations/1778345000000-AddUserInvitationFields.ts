import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserInvitationFields1778345000000 implements MigrationInterface {
    name = 'AddUserInvitationFields1778345000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create the Enum Type
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'PENDING');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$
        `);

        // 2. Add new columns safely
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE'`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invitation_token" varchar(255)`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invitation_expires_at" TIMESTAMP WITH TIME ZONE`);
        
        // 3. Set status based on existing is_active column (only if is_active exists)
        const hasIsActive = await queryRunner.hasColumn("users", "is_active");
        if (hasIsActive) {
            await queryRunner.query(`UPDATE "users" SET "status" = CASE WHEN "is_active" = true THEN 'ACTIVE'::"public"."users_status_enum" ELSE 'INACTIVE'::"public"."users_status_enum" END`);
            // 4. Drop the old column
            await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
        }

        // 5. Add unique constraint for token safely
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UQ_USER_INVITATION_TOKEN') THEN
                    ALTER TABLE "users" ADD CONSTRAINT "UQ_USER_INVITATION_TOKEN" UNIQUE ("invitation_token");
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "is_active" BOOLEAN NOT NULL DEFAULT true`);
        await queryRunner.query(`UPDATE "users" SET "is_active" = CASE WHEN "status" = 'ACTIVE' THEN true ELSE false END`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_USER_INVITATION_TOKEN"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invitation_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invitation_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    }
}
