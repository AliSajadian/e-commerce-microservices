import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { IsUUID, IsNumber, IsEnum, IsString, IsOptional } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}
// export const PaymentStatus = {
//   PENDING: 'pending',
//   SUCCEEDED: 'succeeded',
//   FAILED: 'failed',
//   CANCELED: 'canceled',
//   REFUNDED: 'refunded',
// } as const;
// export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  // Add more as needed
}
// export const PaymentMethod = {
//   CREDIT_CARD: 'credit_card',
//   PAYPAL: 'paypal',
//   BANK_TRANSFER: 'bank_transfer',
//   // Add more as needed
// }
// export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];


@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string; // Link to the order in the order-service

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    // enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus; // Error: 'PaymentStatus' refers to a value, but is being used as a type here. Did you mean 'typeof PaymentStatus'

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    // enum: Object.values(PaymentMethod),
  })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  currency: string;

  @Column({ nullable: true })
  gatewayTransactionId: string; // ID provided by the payment gateway (e.g., Stripe charge ID)

  @Column({ type: 'jsonb', nullable: true }) // Store full gateway response for debugging/auditing
  gatewayResponse: object; 

  @Column({ nullable: true })
  customerEmail: string; // Email used for the payment

  @Column({ nullable: true })
  customerName: string; // Name associated with the payment method

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}