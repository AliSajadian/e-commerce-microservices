import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { IsUUID, IsNumber, IsString, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItem } from './order.item.model'


export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

// Embedded object for address (or a separate entity if addresses are reusable/complex)
// export class Address {
//   @Column({ nullable: true })
//   street: string;

//   @Column({ nullable: true })
//   city: string;

//   @Column({ nullable: true })
//   state: string;

//   @Column({ nullable: true })
//   zipCode: string;

//   @Column({ nullable: true })
//   country: string;
// }

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string; // ID of the user from auth-service

  @OneToMany(() => OrderItem, item => item.order, { cascade: ['insert', 'update'], eager: true })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string; // Link to the payment service

  // @Column(() => Address) // Embed the Address object
  // shippingAddress: Address;

  @Column({ nullable: true })
  shippingAddressStreet: string;

  @Column({ nullable: true })
  shippingAddressCity: string;

  @Column({ nullable: true })
  shippingAddressState: string;

  @Column({ nullable: true })
  shippingAddressZipcode: string;

  @Column({ nullable: true })
  shippingAddressCountry: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  notes: string; // Any special instructions

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}