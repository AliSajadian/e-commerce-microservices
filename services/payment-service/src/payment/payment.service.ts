import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '../stripe/stripe.service';
import { CreatePaymentIntentDto } from '../stripe/dto/create-payment-intent.dto';
import { 
  ConfirmPaymentDto, 
  ConfirmPaymentWithDataDto, 
  PaymentMethodDto 
} from '../stripe/dto/confirm-payment.dto';
import { Payment } from './entities/payment.entity'; // You'll need to create this
import { mapStripeStatusToPaymentStatus, PaymentStatus } from './enums/payment-status.enum'
import Stripe from 'stripe';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEmail, Min, IsString } from 'class-validator';
import { PaymentMethod } from './enums/payment-method.enum';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order ID',
    example: 'order_123'
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: 'customer_123'
  })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Payment amount in cents',
    example: 2000
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    default: 'usd'
  })
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Payment create intent',
    example: ''
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Customer email address',
    example: 'customer@example.com'
  })
  @IsEmail()
  customerEmail?: string;
}

export interface PaymentResponse {
  id: string;
  clientSecret: string;
  status: string;
  amount: number;
  currency: string;
  orderId?: string;
  customerId?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly stripeService: StripeService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

 /**
 * Create a new payment intent with enhanced error tracking
 */
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<PaymentResponse> {
    try {
      const { orderId, customerId, amount, currency = 'usd', description, customerEmail } = createPaymentDto;

      this.logger.log(`=== PAYMENT CREATION START ===`);
      this.logger.log(`Input data: ${JSON.stringify(createPaymentDto)}`);
      this.logger.log(`Creating payment for order: ${orderId}, amount: ${amount}`);

      // Validate amount (minimum 50 cents for most currencies)
      if (amount < 50) {
        this.logger.error(`Amount validation failed: ${amount} < 50`);
        throw new BadRequestException('Amount must be at least 50 cents');
      }
      this.logger.log(`✓ Amount validation passed: ${amount}`);

      // Create payment intent with Stripe
      const stripePaymentIntentDto: CreatePaymentIntentDto = {
        amount,
        currency,
        order_id: orderId,
        customer_id: customerId,
        description: description || `Payment for order ${orderId}`,
        customer_email: customerEmail,
        metadata: {
          orderId,
          customerId,
          createdAt: new Date().toISOString(),
        },
      };

      this.logger.log(`✓ Stripe DTO created: ${JSON.stringify(stripePaymentIntentDto)}`);
      this.logger.log(`Calling Stripe service...`);

      let paymentIntent;
      try {
        paymentIntent = await this.stripeService.createPaymentIntent(stripePaymentIntentDto);
        this.logger.log(`✓ Stripe payment intent created: ${paymentIntent.id}`);
        this.logger.log(`Stripe response: ${JSON.stringify(paymentIntent)}`);
      } catch (stripeError) {
        this.logger.error(`❌ Stripe service error:`, stripeError);
        this.logger.error(`Stripe error type: ${stripeError.constructor.name}`);
        this.logger.error(`Stripe error message: ${stripeError.message}`);
        if (stripeError.code) {
          this.logger.error(`Stripe error code: ${stripeError.code}`);
        }
        throw stripeError;
      }

      this.logger.log(`Creating database payment record...`);

      // Save payment record to database
      let payment;
      try {
        payment = this.paymentRepository.create({
          id: paymentIntent.id,
          orderId,
          customerId,
          amount,
          currency,
          status: mapStripeStatusToPaymentStatus(paymentIntent.status),
          stripePaymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          description,
          customerEmail,
          metadata: paymentIntent.metadata,
          method: PaymentMethod.CREDIT_CARD,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        this.logger.log(`✓ Payment entity created: ${JSON.stringify(payment)}`);
        this.logger.log(`Saving to database...`);

        await this.paymentRepository.save(payment);
        this.logger.log(`✓ Payment saved to database successfully`);

      } catch (dbError) {
        this.logger.error(`❌ Database error:`, dbError);
        this.logger.error(`Database error type: ${dbError.constructor.name}`);
        this.logger.error(`Database error message: ${dbError.message}`);
        throw dbError;
      }

      this.logger.log(`✓ Payment created successfully: ${paymentIntent.id}`);
      this.logger.log(`=== PAYMENT CREATION END ===`);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount,
        currency,
        orderId,
        customerId,
      };
    } catch (error) {
      this.logger.error(`❌ Error creating payment:`, error);
      this.logger.error(`Error type: ${error.constructor.name}`);
      this.logger.error(`Error stack: ${error.stack}`);
      
      // Re-throw with more specific error message
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new BadRequestException(`Failed to create payment: ${error.message}`);
      }
    }
  }

  async createPaymentMethod(paymentMethodDto: PaymentMethodDto) {
    try {
      const paymentMethod = await this.stripeService.createPaymentMethod(paymentMethodDto);
      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        created: paymentMethod.created,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create payment method: ${error.message}`);
    }
  }

  async confirmPaymentWithData(confirmDto: ConfirmPaymentWithDataDto) {
    try {
      const { payment_intent_id, payment_method_data, return_url, use_stripe_sdk } = confirmDto;

      this.logger.log(`Confirming payment: ${payment_intent_id}`);

      // Find payment in database
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId: payment_intent_id },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Confirm payment with Stripe
      // Use payment method data to confirm
      // This is useful for card payments where you have card details
      const paymentIntent = await this.stripeService.confirmPaymentIntentWithData(
        payment_intent_id,
        payment_method_data,
        return_url,
        use_stripe_sdk
      );
      
      // Update payment status in database
      payment.status = mapStripeStatusToPaymentStatus(paymentIntent.status);
      payment.updatedAt = new Date();
      await this.paymentRepository.save(payment);

      this.logger.log(`Payment confirmed: ${payment_intent_id}, status: ${paymentIntent.status}`);

      //return this.formatPaymentResponse(paymentIntent);
      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.orderId,
        customerId: payment.customerId,
      };
    } catch (error) {
      this.logger.error('Error confirming payment:', error);
      throw new BadRequestException(`Failed to confirm payment: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPayment(confirmPaymentDto: ConfirmPaymentDto): Promise<PaymentResponse> {
    try {
      const { payment_intent_id } = confirmPaymentDto;

      this.logger.log(`Confirming payment: ${payment_intent_id}`);

      // Find payment in database
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId: payment_intent_id },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      // Confirm payment with Stripe
      const paymentIntent = await this.stripeService.confirmPaymentIntent(confirmPaymentDto);

      // Update payment status in database
      payment.status = mapStripeStatusToPaymentStatus(paymentIntent.status);
      payment.updatedAt = new Date();
      await this.paymentRepository.save(payment);

      this.logger.log(`Payment confirmed: ${payment_intent_id}, status: ${paymentIntent.status}`);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.orderId,
        customerId: payment.customerId,
      };
    } catch (error) {
      this.logger.error('Error confirming payment:', error);
      throw new BadRequestException(`Failed to confirm payment: ${error.message}`);
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    return payment;
  }

  /**
   * Get all payments for a customer
   */
  async getPaymentsByCustomerId(customerId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<PaymentResponse> {
    try {
      const payment = await this.getPayment(paymentId);

      if (payment.status === PaymentStatus.SUCCEEDED) {
        throw new BadRequestException('Cannot cancel a successful payment');
      }

      if (payment.status === PaymentStatus.CANCELED) {
        throw new BadRequestException('Payment is already canceled');
      }

      // Cancel with Stripe
      const paymentIntent = await this.stripeService.cancelPaymentIntent(payment.stripePaymentIntentId);

      // Update status in database
      payment.status = mapStripeStatusToPaymentStatus(paymentIntent.status);
      payment.updatedAt = new Date();
      await this.paymentRepository.save(payment);

      this.logger.log(`Payment canceled: ${paymentId}`);

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.orderId,
        customerId: payment.customerId,
      };
    } catch (error) {
      this.logger.error('Error canceling payment:', error);
      throw new BadRequestException(`Failed to cancel payment: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  async refundPayment(paymentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const payment = await this.getPayment(paymentId);

      if (payment.status !== PaymentStatus.SUCCEEDED) {
        throw new BadRequestException('Can only refund successful payments');
      }

      this.logger.log(`Creating refund for payment: ${paymentId}`);

      const refund = await this.stripeService.createRefund(payment.stripePaymentIntentId, amount);

      // Update payment status if full refund
      if (!amount || amount === payment.amount) {
        payment.status = mapStripeStatusToPaymentStatus('refunded');
        payment.updatedAt = new Date();
        await this.paymentRepository.save(payment);
      }

      this.logger.log(`Refund created: ${refund.id} for payment: ${paymentId}`);
      return refund;
    } catch (error) {
      this.logger.error('Error creating refund:', error);
      throw new BadRequestException(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Sync payment status with Stripe
   */
  async syncPaymentStatus(paymentId: string): Promise<Payment> {
    try {
      const payment = await this.getPayment(paymentId);
      
      // Get latest status from Stripe
      const paymentIntent = await this.stripeService.retrievePaymentIntent(payment.stripePaymentIntentId);
      
      // Update status if different
      if (payment.status !== paymentIntent.status) {
        payment.status = mapStripeStatusToPaymentStatus(paymentIntent.status);
        payment.updatedAt = new Date();
        await this.paymentRepository.save(payment);
        
        this.logger.log(`Payment status synced: ${paymentId}, new status: ${paymentIntent.status}`);
      }
      
      return payment;
    } catch (error) {
      this.logger.error('Error syncing payment status:', error);
      throw new BadRequestException(`Failed to sync payment status: ${error.message}`);
    }
  }

  /**
   * Update payment status (called by webhook service)
   */
  async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: string,
    stripeData?: any,
  ): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { stripePaymentIntentId },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for Stripe payment intent: ${stripePaymentIntentId}`);
        return;
      }

      payment.status = mapStripeStatusToPaymentStatus(status);
      payment.updatedAt = new Date();
      
      if (stripeData) {
        payment.metadata = { ...payment.metadata, ...stripeData.metadata };
      }

      await this.paymentRepository.save(payment);
      this.logger.log(`Payment status updated: ${payment.id}, new status: ${status}`);
    } catch (error) {
      this.logger.error('Error updating payment status:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(customerId?: string): Promise<any> {
    try {
      const whereCondition = customerId ? { customerId } : {};
      
      const totalPayments = await this.paymentRepository.count({ where: whereCondition });
      
      const succeededPayments = await this.paymentRepository.count({
        where: { ...whereCondition, status: PaymentStatus.SUCCEEDED },
      });
      
      const failedPayments = await this.paymentRepository.count({
        where: { ...whereCondition, status: PaymentStatus.PAYMENT_FAILED },
      });
      
      const canceledPayments = await this.paymentRepository.count({
        where: { ...whereCondition, status: PaymentStatus.CANCELED },
      });

      // Calculate total amount of successful payments
      const totalAmountResult = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'totalAmount')
        .where('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
        .andWhere(customerId ? 'payment.customerId = :customerId' : '1=1', { customerId })
        .getRawOne();

      const totalAmount = totalAmountResult?.totalAmount || 0;

      return {
        totalPayments,
        succeededPayments,
        failedPayments,
        canceledPayments,
        totalAmount: parseInt(totalAmount),
        successRate: totalPayments > 0 ? (succeededPayments / totalPayments) * 100 : 0,
      };
    } catch (error) {
      this.logger.error('Error getting payment stats:', error);
      throw new BadRequestException(`Failed to get payment stats: ${error.message}`);
    }
  }

  /**
   * Search payments with filters
   */
  async searchPayments(filters: {
    customerId?: string;
    orderId?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; total: number }> {
    try {
      const {
        customerId,
        orderId,
        status,
        dateFrom,
        dateTo,
        limit = 10,
        offset = 0,
      } = filters;

      const queryBuilder = this.paymentRepository.createQueryBuilder('payment');

      if (customerId) {
        queryBuilder.andWhere('payment.customerId = :customerId', { customerId });
      }

      if (orderId) {
        queryBuilder.andWhere('payment.orderId = :orderId', { orderId });
      }

      if (status) {
        queryBuilder.andWhere('payment.status = :status', { status });
      }

      if (dateFrom) {
        queryBuilder.andWhere('payment.createdAt >= :dateFrom', { dateFrom });
      }

      if (dateTo) {
        queryBuilder.andWhere('payment.createdAt <= :dateTo', { dateTo });
      }

      const total = await queryBuilder.getCount();
      
      const payments = await queryBuilder
        .orderBy('payment.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      return { payments, total };
    } catch (error) {
      this.logger.error('Error searching payments:', error);
      throw new BadRequestException(`Failed to search payments: ${error.message}`);
    }
  }
}

