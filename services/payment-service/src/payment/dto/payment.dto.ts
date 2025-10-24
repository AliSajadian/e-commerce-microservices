import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsEnum, IsString, IsOptional } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
  // ... other methods
}

export class PaymentDto {
  @ApiProperty({ example: 'f87a32d1-e9c1-4b12-9c1a-5b871c5a9b8d' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: '6d29f78b-6f99-4194-9b35-72edb91b252a' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  currency: string;
  
  @ApiProperty({ example: 'ch_1Hh8Xo2eZvKYlo2C21pD2x0y' })
  @IsOptional()
  gatewayTransactionId: string; // ID from Stripe or PayPal
  
  @ApiProperty({ example: 'Success' })
  @IsOptional()
  gatewayResponse: string;

  @ApiProperty({ example: new Date() })
  createdAt: Date;
  
  @ApiProperty({ example: new Date() })
  updatedAt: Date;
}