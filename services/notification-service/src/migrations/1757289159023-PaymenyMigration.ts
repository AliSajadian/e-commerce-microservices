import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymenyMigration1757289159023 implements MigrationInterface {
    name = 'PaymenyMigration1757289159023'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('info', 'warning', 'error', 'success', 'system', 'user_action')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_status_enum" AS ENUM('unread', 'read', 'archived')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "message" text NOT NULL, "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'info', "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'unread', "userId" uuid NOT NULL, "metadata" json, "actionUrl" character varying(255), "category" character varying(100), "readAt" TIMESTAMP, "expiresAt" TIMESTAMP, "isPushSent" boolean NOT NULL DEFAULT false, "isEmailSent" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_831a5a06f879fb0bebf8965871" ON "notifications" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_78207b2dc2b0d717649e89d3fc" ON "notifications" ("userId", "status") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "avatar" character varying(255), "isActive" boolean NOT NULL DEFAULT true, "preferredLanguage" character varying(50), "timezone" character varying(100), "lastSyncedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_409a0298fdd86a6495e23c25c6" ON "users" ("isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."user_sync_events_eventtype_enum" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_activated', 'user_deactivated')`);
        await queryRunner.query(`CREATE TYPE "public"."user_sync_events_status_enum" AS ENUM('pending', 'processed', 'failed', 'skipped')`);
        await queryRunner.query(`CREATE TABLE "user_sync_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "eventType" "public"."user_sync_events_eventtype_enum" NOT NULL, "userData" json NOT NULL, "status" "public"."user_sync_events_status_enum" NOT NULL DEFAULT 'pending', "errorMessage" text, "retryCount" integer NOT NULL DEFAULT '0', "processedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_70e1f52bf4b4422a6c65dfcd562" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_932a36eb6e04cecb8d51f1a939" ON "user_sync_events" ("status", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0a223c8b986499a766029de790" ON "user_sync_events" ("userId", "eventType") `);
        await queryRunner.query(`CREATE TABLE "notification_service_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "globalNotificationsEnabled" boolean NOT NULL DEFAULT true, "quietHours" json, "maxNotificationsPerDay" integer NOT NULL DEFAULT '50', "todayNotificationCount" integer NOT NULL DEFAULT '0', "lastNotificationDate" date, "isVip" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b8632833b701b43fa8590cfd773" UNIQUE ("userId"), CONSTRAINT "REL_b8632833b701b43fa8590cfd77" UNIQUE ("userId"), CONSTRAINT "PK_4b44bb2db3a047ac35b0dcf1276" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notification_templates_type_enum" AS ENUM('info', 'warning', 'error', 'success', 'system', 'user_action')`);
        await queryRunner.query(`CREATE TABLE "notification_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "title" character varying(255) NOT NULL, "messageTemplate" text NOT NULL, "type" "public"."notification_templates_type_enum" NOT NULL DEFAULT 'info', "category" character varying(100), "isActive" boolean NOT NULL DEFAULT true, "defaultMetadata" json, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4118447024198c4ac2203a8218b" UNIQUE ("name"), CONSTRAINT "PK_76f0fc48b8d057d2ae7f3a2848a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notification_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "category" character varying(100) NOT NULL, "inAppEnabled" boolean NOT NULL DEFAULT true, "emailEnabled" boolean NOT NULL DEFAULT true, "pushEnabled" boolean NOT NULL DEFAULT false, "smsEnabled" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_90d452c90494da1080c16b52c19" UNIQUE ("userId", "category"), CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notification_devices_devicetype_enum" AS ENUM('ios', 'android', 'web')`);
        await queryRunner.query(`CREATE TABLE "notification_devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "deviceToken" character varying(500) NOT NULL, "deviceType" "public"."notification_devices_devicetype_enum" NOT NULL, "deviceName" character varying(100), "isActive" boolean NOT NULL DEFAULT true, "lastUsedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e10c4c1abd87d91ceddbb60a2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_24be45734ec516091a8c3f249a" ON "notification_devices" ("userId", "isActive") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_service_users" ADD CONSTRAINT "FK_b8632833b701b43fa8590cfd773" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_b70c44e8b00757584a393225593" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_devices" ADD CONSTRAINT "FK_3a16eae8ba29a8d22d0a910d148" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notification_devices" DROP CONSTRAINT "FK_3a16eae8ba29a8d22d0a910d148"`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_b70c44e8b00757584a393225593"`);
        await queryRunner.query(`ALTER TABLE "notification_service_users" DROP CONSTRAINT "FK_b8632833b701b43fa8590cfd773"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24be45734ec516091a8c3f249a"`);
        await queryRunner.query(`DROP TABLE "notification_devices"`);
        await queryRunner.query(`DROP TYPE "public"."notification_devices_devicetype_enum"`);
        await queryRunner.query(`DROP TABLE "notification_preferences"`);
        await queryRunner.query(`DROP TABLE "notification_templates"`);
        await queryRunner.query(`DROP TYPE "public"."notification_templates_type_enum"`);
        await queryRunner.query(`DROP TABLE "notification_service_users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a223c8b986499a766029de790"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_932a36eb6e04cecb8d51f1a939"`);
        await queryRunner.query(`DROP TABLE "user_sync_events"`);
        await queryRunner.query(`DROP TYPE "public"."user_sync_events_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_sync_events_eventtype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_409a0298fdd86a6495e23c25c6"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_78207b2dc2b0d717649e89d3fc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_831a5a06f879fb0bebf8965871"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
