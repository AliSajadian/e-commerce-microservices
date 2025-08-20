import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

import { OrderItemDto } from './order.item.dto';
import { AddressDto } from './address.dto';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

export class OrderDto {
  @ApiProperty({ example: '6d29f78b-6f99-4194-9b35-72edb91b252a' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'b9d1563c-7efc-4c8b-9787-5a90241a4a50' })
  @IsUUID()
  userId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  totalPrice: number;
  
  @ApiProperty({ example: 'f87a32d1-e9c1-4b12-9c1a-5b871c5a9b8d' })
  @IsUUID()
  @IsOptional()
  paymentId: string; // Link to the payment service

  @ApiProperty({ type: AddressDto })
  @IsOptional()
  shippingAddress: AddressDto;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  @IsEnum(OrderStatus)
  status: OrderStatus;
  
  @ApiProperty({ example: new Date() })
  createdAt: Date;
  
  @ApiProperty({ example: new Date() })
  updatedAt: Date;
}