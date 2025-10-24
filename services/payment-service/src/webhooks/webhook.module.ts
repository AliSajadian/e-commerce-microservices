import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { StripeModule } from '../stripe/stripe.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    StripeModule, // For StripeService to verify webhook signatures
    PaymentModule, // For PaymentService to update payment statuses
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService], // Export in case other modules need webhook functionality
})
export class WebhookModule {}