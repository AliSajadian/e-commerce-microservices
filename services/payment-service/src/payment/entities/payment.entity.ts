import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

// export enum PaymentStatus {
//   PENDING = 'pending',
//   SUCCEEDED = 'succeeded',
//   FAILED = 'failed',
//   CANCELED = 'canceled',
//   REFUNDED = 'refunded',
// }

// export enum PaymentMethod {
//   CREDIT_CARD = 'credit_card',
//   PAYPAL = 'paypal',
//   BANK_TRANSFER = 'bank_transfer',
//   // Add more as needed
// }

@Entity('payments')
@Index(['customerId'])
@Index(['orderId'])
@Index(['status'])
@Index(['createdAt'])
export class Payment {
  @PrimaryColumn()
  id: string; // This will be the Stripe Payment Intent ID

  @Column()
  orderId: string;

  @Column()
  customerId: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'usd' })
  currency: string;

  // @Column()
  // @Index()
  // status: string; // pending, succeeded, payment_failed, canceled, refunded, etc.

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    // enum: Object.values(PaymentStatus),
    default: PaymentStatus.CREATED,
  })
  status: PaymentStatus; // Error: 'PaymentStatus' refers to a value, but is being used as a type here. Did you mean 'typeof PaymentStatus'

  @Column()
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  clientSecret: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  // @Column({ nullable: true })
  // paymentMethodId: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    // enum: Object.values(PaymentMethod),
  })
  method: PaymentMethod;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  refundedAmount: number;

  @Column('json', { nullable: true })
  stripeData: Record<string, any>; // Store full Stripe response if needed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}