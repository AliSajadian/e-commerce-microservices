import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Stripe from 'stripe';
import stripeConfig from '../config/stripe.config';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto, PaymentMethodDto } from './dto/confirm-payment.dto';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    @Inject(stripeConfig.KEY)
    private config: ConfigType<typeof stripeConfig>,
  ) {
    this.stripe = new Stripe(this.config.secretKey, {
      apiVersion: this.config.apiVersion as any,
    });
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(createPaymentIntentDto: CreatePaymentIntentDto): Promise<Stripe.PaymentIntent> {
    try {
      this.logger.log(`Stripe API call with: ${JSON.stringify(createPaymentIntentDto)}`);

      const {
        amount,
        currency,
        payment_method_types,
        customer_email,
        order_id,
        customer_id,
        description,
        metadata,
        automatic_payment_methods,
      } = createPaymentIntentDto;

      this.logger.log(`Creating payment intent for amount: ${amount} ${currency}`);

      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency,
        payment_method_types,
        automatic_payment_methods,
        description: description || `Payment for order ${order_id}`,
        metadata: {
          order_id: order_id || '',
          customer_id: customer_id || '',
          ...metadata,
        },
      };

      // Add customer email if provided
      if (customer_email) {
        paymentIntentParams.receipt_email = customer_email;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      this.logger.log(`Payment intent created successfully: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Error creating payment intent:', error);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(paymentMethodDto: PaymentMethodDto): Promise<Stripe.PaymentMethod> {
    try {
      this.logger.log('Creating payment method');
      
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: paymentMethodDto.type as Stripe.PaymentMethodCreateParams.Type,
        card: paymentMethodDto.card,
        billing_details: paymentMethodDto.billing_details,
      });

      this.logger.log(`Payment method created: ${paymentMethod.id}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error('Error creating payment method:', error);
      throw new Error(`Failed to create payment method: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(confirmPaymentDto: ConfirmPaymentDto): Promise<Stripe.PaymentIntent> {
    try {
      const { payment_intent_id, payment_method, return_url, use_stripe_sdk } = confirmPaymentDto;

      this.logger.log(`Confirming payment intent: ${payment_intent_id}`);

      const confirmParams: Stripe.PaymentIntentConfirmParams = {};

      if (payment_method) {
        confirmParams.payment_method = payment_method;
      }

      if (return_url) {
        confirmParams.return_url = return_url;
      }

      if (use_stripe_sdk !== undefined) {
        confirmParams.use_stripe_sdk = use_stripe_sdk;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        payment_intent_id,
        confirmParams,
      );

      this.logger.log(`Payment intent confirmed: ${paymentIntent.id}, status: ${paymentIntent.status}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Error confirming payment intent:', error);
      throw new Error(`Failed to confirm payment intent: ${error.message}`);
    }
  }

  /**
   * Confirm a payment intent with payment method data (e.g., card details)
   */
  async confirmPaymentIntentWithData(
    paymentIntentId: string,
    paymentMethodData: PaymentMethodDto,
    returnUrl?: string,
    useStripeSdk?: boolean
  ): Promise<Stripe.PaymentIntent> {
    try {
      this.logger.log(`Confirming payment intent with payment method data: ${paymentIntentId}`);
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        payment_method_data: {
          type: paymentMethodData.type as Stripe.PaymentIntentConfirmParams.PaymentMethodData.Type,
          card: {
            number: paymentMethodData.card.number,
            exp_month: paymentMethodData.card.exp_month,
            exp_year: paymentMethodData.card.exp_year,
            cvc: paymentMethodData.card.cvc,
          }
        } as any, // Type assertion to bypass TypeScript checking
      };

      if (paymentMethodData.billing_details) {
        confirmParams.payment_method_data.billing_details = paymentMethodData.billing_details;
      }

      if (returnUrl) {
        confirmParams.return_url = returnUrl;
      }

      if (useStripeSdk !== undefined) {
        confirmParams.use_stripe_sdk = useStripeSdk;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams,
      );

      this.logger.log(`Payment intent confirmed: ${paymentIntent.id}, status: ${paymentIntent.status}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Error confirming payment intent with data:', error);
      throw new Error(`Failed to confirm payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Error retrieving payment intent:', error);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      this.logger.log(`Payment intent canceled: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Error canceling payment intent:', error);
      throw new Error(`Failed to cancel payment intent: ${error.message}`);
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(email: string, name?: string, metadata?: Record<string, any>): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      this.logger.log(`Customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Retrieve a customer
   */
  async retrieveCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      return customer;
    } catch (error) {
      this.logger.error('Error retrieving customer:', error);
      throw new Error(`Failed to retrieve customer: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);
      this.logger.log(`Refund created: ${refund.id} for payment intent: ${paymentIntentId}`);
      return refund;
    } catch (error) {
      this.logger.error('Error creating refund:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret,
      );
      return event;
    } catch (error) {
      this.logger.error('Error constructing webhook event:', error);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Get Stripe instance for advanced operations
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}