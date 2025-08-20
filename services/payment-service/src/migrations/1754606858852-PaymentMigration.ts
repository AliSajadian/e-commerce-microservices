import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentMigration1754606858852 implements MigrationInterface {
    name = 'PaymentMigration1754606858852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'succeeded', 'failed', 'canceled', 'refunded')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_method_enum" AS ENUM('credit_card', 'paypal', 'bank_transfer')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "method" "public"."payments_method_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying NOT NULL, "gatewayTransactionId" character varying, "gatewayResponse" jsonb, "customerEmail" character varying, "customerName" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    }

}
