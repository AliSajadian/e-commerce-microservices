import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymenyMigration1757100464408 implements MigrationInterface {
    name = 'PaymenyMigration1757100464408'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'canceled', 'refunded')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_method_enum" AS ENUM('credit_card', 'paypal', 'bank_transfer')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "method" "public"."payments_method_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying NOT NULL, "gatewayTransactionId" character varying, "gatewayResponse" jsonb, "customerEmail" character varying, "customerName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "gatewayTransactionId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "gatewayResponse"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "customerName"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "gatewayTransactionId" character varying`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "gatewayResponse" jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "customerName" character varying`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "customerId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "stripePaymentIntentId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "clientSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "description" character varying`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "metadata" json`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "receiptUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "refundedAmount" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "stripeData" json`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "orderId"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "orderId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'usd'`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum" RENAME TO "payments_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded', 'created', 'pending', 'payment_failed', 'refunded', 'partially_refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum" USING "status"::"text"::"public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'created'`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_8277a466232344577740a61344" ON "payments" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_af929a5f2a400fdb6913b4967e" ON "payments" ("orderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_824be6feda5e655c49c4e0c534" ON "payments" ("customerId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_824be6feda5e655c49c4e0c534"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af929a5f2a400fdb6913b4967e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8277a466232344577740a61344"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum_old" AS ENUM('pending', 'succeeded', 'failed', 'canceled', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum_old" USING "status"::"text"::"public"."payments_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum_old" RENAME TO "payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "currency" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "orderId"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "orderId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "stripeData"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "refundedAmount"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "receiptUrl"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "clientSecret"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "stripePaymentIntentId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "customerId"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "customerName"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "gatewayResponse"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "gatewayTransactionId"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "customerName" character varying`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "gatewayResponse" jsonb`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "gatewayTransactionId" character varying`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    }

}
