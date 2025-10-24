// /payment-service/src/payment/entity/payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { Currency } from '../enums/payment-currency.enum';
import { PaymentErrorCode } from '../enums/payment-error-code.enum';
import { Refund } from './refund.entity';


@Entity('payments')
@Index(['customerId'])
@Index(['orderId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['stripePaymentIntentId'])
@Index(['paymentIntentId']) // For generic payment intent tracking
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Internal UUID

  @Column({ unique: true })
  paymentIntentId: string; // Stripe Payment Intent ID or equivalent from other providers

  @Column()
  orderId: string;

  @Column()
  customerId: string; // Maps to userId in gRPC

  @Column()
  userId: string; // Explicit user ID field for gRPC compatibility

  // Amount stored in smallest currency unit (cents, pence, etc.)
  @Column('bigint')
  amountCents: number; // Changed from decimal to bigint for precision

  // Convenience getter/setter for dollar amounts
  get amount(): number {
    return this.amountCents / 100;
  }

  set amount(dollarAmount: number) {
    this.amountCents = Math.round(dollarAmount * 100);
  }

  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.USD,
  })
  currency: Currency;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PAYMENT_STATUS_PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  // Provider-specific fields (Stripe, PayPal, etc.)
  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeClientSecret: string;

  @Column({ nullable: true })
  paypalOrderId: string;

  @Column({ nullable: true })
  paypalTransactionId: string;

  @Column({ nullable: true })
  providerTransactionId: string; // Generic provider transaction ID

  @Column({ nullable: true })
  clientSecret: string; // Generic client secret for frontend

  @Column({ nullable: true })
  redirectUrl: string; // For redirect-based payments

  @Column({ nullable: true })
  confirmationToken: string; // For 3D Secure and similar

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  customerEmail: string;

  // Error handling
  @Column({
    type: 'enum',
    enum: PaymentErrorCode,
    nullable: true,
  })
  errorCode: PaymentErrorCode;

  @Column({ nullable: true })
  errorMessage: string;

  // Timing fields
  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  confirmedAt: Date;

  @Column({ nullable: true })
  cancelledAt: Date;

  // Payment method details (stored as JSON for flexibility)
  @Column('json', { nullable: true })
  paymentMethodDetails: {
    cardLast4?: string;
    cardBrand?: string;
    cardHolderName?: string;
    expiryMonth?: string;
    expiryYear?: string;
    paypalEmail?: string;
    bankName?: string;
    walletProvider?: string;
    [key: string]: any;
  };

  // Billing address (stored as JSON)
  @Column('json', { nullable: true })
  billingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    countryCode?: string;
  };

  // Metadata for additional information
  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  // Payment-specific metadata (IP, user agent, etc.)
  @Column('json', { nullable: true })
  paymentMetadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    customFields?: Record<string, string>;
  };

  // Refund tracking
  @Column('bigint', { default: 0 })
  refundedAmountCents: number;

  get refundedAmount(): number {
    return this.refundedAmountCents / 100;
  }

  set refundedAmount(dollarAmount: number) {
    this.refundedAmountCents = Math.round(dollarAmount * 100);
  }

  @Column('bigint', { nullable: true })
  availableForRefundCents: number;

  get availableForRefund(): number {
    return (this.availableForRefundCents || this.amountCents - this.refundedAmountCents) / 100;
  }

  // Provider-specific data storage
  @Column('json', { nullable: true })
  stripeData: Record<string, any>;

  @Column('json', { nullable: true })
  paypalData: Record<string, any>;

  @Column('json', { nullable: true })
  providerData: Record<string, any>; // Generic provider data

  // Idempotency
  @Column({ nullable: true, unique: true })
  idempotencyKey: string;

  // Relations
  @OneToMany(() => Refund, refund => refund.payment)
  refunds: Refund[];

  // Receipt and documentation
  @Column({ nullable: true })
  receiptUrl: string;

  @Column({ nullable: true })
  receiptNumber: string;

  // Fraud detection
  @Column({ default: false })
  fraudDetected: boolean;

  @Column('json', { nullable: true })
  fraudData: {
    riskScore?: number;
    riskLevel?: string;
    checks?: Record<string, any>;
  };

  // Audit fields
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string; // User or system that created the payment

  // Helper methods
  isRefundable(): boolean {
    return this.status === PaymentStatus.PAYMENT_STATUS_COMPLETED && 
           this.refundedAmountCents < this.amountCents;
  }

  canBeConfirmed(): boolean {
    return [PaymentStatus.PAYMENT_STATUS_PENDING, PaymentStatus.PAYMENT_STATUS_REQUIRES_ACTION].includes(this.status);
  }

  canBeCancelled(): boolean {
    return [PaymentStatus.PAYMENT_STATUS_PENDING, PaymentStatus.PAYMENT_STATUS_REQUIRES_ACTION].includes(this.status);
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  getRemainingRefundAmount(): number {
    return this.amount - this.refundedAmount;
  }

  // Convert to gRPC response format
  toGrpcResponse(): any {
    return {
      payment_id: this.id,
      order_id: this.orderId,
      user_id: this.userId,
      amount: {
        amount: this.amountCents,
        currency: this.currency,
      },
      status: this.status,
      payment_method: {
        method: this.paymentMethod,
        ...this.paymentMethodDetails,
      },
      billing_address: this.billingAddress,
      description: this.description,
      provider_transaction_id: this.providerTransactionId,
      refunds: this.refunds?.map(refund => refund.toGrpcResponse()) || [],
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
      confirmed_at: this.confirmedAt?.toISOString(),
      error_code: this.errorCode,
      error_message: this.errorMessage,
    };
  }

  // Create from gRPC request
  static fromGrpcRequest(request: any): Partial<Payment> {
    return {
      orderId: request.order_id,
      userId: request.user_id,
      customerId: request.user_id, // Assuming user_id is customer_id
      amountCents: request.amount.amount,
      currency: request.amount.currency,
      paymentMethod: request.payment_method.method,
      paymentMethodDetails: request.payment_method,
      billingAddress: request.billing_address,
      description: request.description,
      idempotencyKey: request.idempotency_key,
      expiresAt: request.expires_in_seconds ? 
        new Date(Date.now() + request.expires_in_seconds * 1000) : null,
      paymentMetadata: request.metadata,
    };
  }
}