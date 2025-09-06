import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { StripeModule } from '../stripe/stripe.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    StripeModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
