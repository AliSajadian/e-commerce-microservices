import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymenyMigration1758303354443 implements MigrationInterface {
    name = 'PaymenyMigration1758303354443'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "reservationId" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "reservationId"`);
    }

}
