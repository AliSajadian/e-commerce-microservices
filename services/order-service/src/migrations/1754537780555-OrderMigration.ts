import { MigrationInterface, QueryRunner } from "typeorm";

export class OrderMigration1754537780555 implements MigrationInterface {
    name = 'OrderMigration1754537780555'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "price" numeric(10,2) NOT NULL, "quantity" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderId" uuid NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "items"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "notes" text`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressStreet" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressCity" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressState" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressZipcode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "shippingAddressCountry" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "totalPrice"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "totalPrice" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'paid', 'shipped', 'delivered', 'canceled', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum_old" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING "status"::"text"::"public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum_old" RENAME TO "orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "totalPrice"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "totalPrice" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressCountry"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressZipcode"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressState"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressCity"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "shippingAddressStreet"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentId"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "items" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`DROP TABLE "order_items"`);
    }

}
