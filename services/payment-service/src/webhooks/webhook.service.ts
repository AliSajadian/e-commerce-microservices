import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { PaymentService } from '../payment/payment.service';
import Stripe from 'stripe';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Handle Stripe webhook events
   */
  async handleStripeEvent(payload: string | Buffer, signature: string): Promise<void> {
    try {
      // Verify webhook signature and construct event
      const event = this.stripeService.constructWebhookEvent(payload, signature);
      
      this.logger.log(`Processing webhook event: ${event.type}, ID: ${event.id}`);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.created':
          await this.handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.processing':
          await this.handlePaymentIntentProcessing(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.requires_action':
          await this.handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object as Stripe.Charge);
          break;

        case 'charge.failed':
          await this.handleChargeFailed(event.data.object as Stripe.Charge);
          break;

        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

    } catch (error) {
      this.logger.error('Error handling webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}, amount: ${paymentIntent.amount}`);
    
    try {
      const { order_id, customer_id } = paymentIntent.metadata || {};
      
      // Update payment status in database
      await this.paymentService.updatePaymentStatus(paymentIntent.id, 'succeeded', paymentIntent);
      
      // Update order status if order_id exists
      if (order_id) {
        this.logger.log(`Updating order status for order: ${order_id}`);
        // TODO: Call order service here to update order status
        // await this.orderService.updateOrderStatus(order_id, 'paid');
      }

      // Send confirmation email or notification
      if (paymentIntent.receipt_email) {
        this.logger.log(`Sending confirmation to: ${paymentIntent.receipt_email}`);
        // TODO: Send notification
        // await this.notificationService.sendPaymentConfirmation(paymentIntent.receipt_email, paymentIntent);
      }

      this.logger.log(`Payment success handling completed for: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment success for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);
    
    try {
      const { order_id, customer_id } = paymentIntent.metadata || {};
      
      // Update payment status in database
      await this.paymentService.updatePaymentStatus(paymentIntent.id, 'payment_failed', paymentIntent);
      
      // Update order status if order_id exists
      if (order_id) {
        this.logger.log(`Updating order status for failed payment, order: ${order_id}`);
        // TODO: Call order service
        // await this.orderService.updateOrderStatus(order_id, 'payment_failed');
      }

      // Send failure notification
      if (paymentIntent.receipt_email) {
        this.logger.log(`Sending failure notification to: ${paymentIntent.receipt_email}`);
        // TODO: Send notification
        // await this.notificationService.sendPaymentFailedNotification(paymentIntent.receipt_email, paymentIntent);
      }

      this.logger.log(`Payment failure handling completed for: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment failure for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Handle canceled payment
   */
  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment canceled: ${paymentIntent.id}`);
    
    try {
      const { order_id } = paymentIntent.metadata || {};
      
      // Update payment status in database
      await this.paymentService.updatePaymentStatus(paymentIntent.id, 'canceled', paymentIntent);
      
      if (order_id) {
        // TODO: Call order service
        // await this.orderService.updateOrderStatus(order_id, 'canceled');
      }

      this.logger.log(`Payment cancellation handling completed for: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment cancellation for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Handle payment intent created
   */
  private async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment intent created: ${paymentIntent.id}`);
    
    try {
      // Update payment status in database
      await this.paymentService.updatePaymentStatus(paymentIntent.id, 'created', paymentIntent);
      
      this.logger.log(`Payment intent creation handling completed for: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment intent creation for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Handle payment processing
   */
  private async handlePaymentIntentProcessing(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment processing: ${paymentIntent.id}`);
    
    try {
      await this.paymentService.updatePaymentStatus(paymentIntent.id, 'processing', paymentIntent);
      this.logger.log(`Payment processing handling completed for: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment processing for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Handle payment requires action
   */
  private async handlePaymentIntentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment requires action: ${paymentIntent.id}`);
    
    try {
      await this.paymentService.updatePaymentStatus(paymentIntent.id, 'requires_action', paymentIntent);
      this.logger.log(`Payment requires action handling completed for: ${paymentIntent.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment requires action for ${paymentIntent.id}:`, error);
    }
  }

  /**
   * Handle charge succeeded
   */
  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge succeeded: ${charge.id}, amount: ${charge.amount}`);
    // Additional charge-specific logic if needed
    
    // Note: If you're using PaymentIntents, you'll mostly get payment_intent events
    // Charges are lower-level and usually don't need separate handling
  }

  /**
   * Handle charge failed
   */
  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge failed: ${charge.id}, failure message: ${charge.failure_message}`);
    // Additional charge failure logic if needed
  }

  /**
   * Handle customer created
   */
  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    this.logger.log(`Customer created: ${customer.id}, email: ${customer.email}`);
    // Store customer information or sync with user service
    // TODO: Sync with user service if needed
    // await this.userService.syncStripeCustomer(customer);
  }

  /**
   * Handle invoice payment succeeded
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    // Handle subscription or recurring payment logic
    // TODO: Handle subscription payments
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);
    // Handle subscription payment failure
    // TODO: Handle subscription payment failures
  }
}