import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymenyMigration1757486205068 implements MigrationInterface {
    name = 'PaymenyMigration1757486205068'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "providerMessageId" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "UQ_e02a84ce49f34201d48249a7c52" UNIQUE ("providerMessageId")`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "deliveredAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "failedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "failureReason" character varying(500)`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_status_enum" RENAME TO "notifications_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('unread', 'read', 'archived', 'failed', 'delivered', 'send')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "public"."notifications_status_enum" USING "status"::"text"::"public"."notifications_status_enum"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'unread'`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum_old" AS ENUM('unread', 'read', 'archived')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" TYPE "public"."notifications_status_enum_old" USING "status"::"text"::"public"."notifications_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "status" SET DEFAULT 'unread'`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_status_enum_old" RENAME TO "notifications_status_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("status", "userId") `);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "failureReason"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "failedAt"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deliveredAt"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "UQ_e02a84ce49f34201d48249a7c52"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "providerMessageId"`);
    }

}
