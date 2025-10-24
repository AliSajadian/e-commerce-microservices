// /payment-service/src/payment/entity/refund.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Payment } from './payment.entity';
import { Currency } from '../enums/payment-currency.enum';

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('refunds')
@Index(['paymentId'])
@Index(['status'])
@Index(['createdAt'])
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  paymentId: string;

  @ManyToOne(() => Payment, payment => payment.refunds)
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  // Amount in smallest currency unit
  @Column('bigint')
  amountCents: number;

  get amount(): number {
    return this.amountCents / 100;
  }

  set amount(dollarAmount: number) {
    this.amountCents = Math.round(dollarAmount * 100);
  }

  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency: Currency;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  providerRefundId: string; // Stripe refund ID, PayPal refund ID, etc.

  @Column({ nullable: true })
  providerTransactionId: string;

  @Column({ nullable: true, unique: true })
  idempotencyKey: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column('json', { nullable: true })
  providerData: Record<string, any>;

  @Column({ nullable: true })
  processedAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  // Convert to gRPC response format
  toGrpcResponse(): any {
    return {
      refund_id: this.id,
      amount: {
        amount: this.amountCents,
        currency: this.currency,
      },
      reason: this.reason,
      status: this.status,
      created_at: this.createdAt.toISOString(),
      processed_at: this.processedAt?.toISOString(),
    };
  }
}