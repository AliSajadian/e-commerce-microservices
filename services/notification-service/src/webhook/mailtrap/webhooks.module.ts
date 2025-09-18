import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailtrapWebhookController } from './mailtrap-webhook.controller';
import { MailtrapWebhookService } from './mailtrap-webhook.service';
import { NotificationModule } from '../../notification/notification.module';

@Module({
  imports: [ConfigModule, NotificationModule],
  controllers: [MailtrapWebhookController],
  providers: [MailtrapWebhookService],
  exports: [MailtrapWebhookService],
})
export class WebhooksModule {}
