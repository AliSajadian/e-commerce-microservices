import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEmail, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Amount in cents (e.g., 2000 for $20.00)',
    example: 2000,
    minimum: 50,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(50) // Minimum 50 cents
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    default: 'usd',
  })
  @IsString()
  @IsNotEmpty()
  currency: string = 'usd';

  @ApiPropertyOptional({
    description: 'Payment method types',
    example: ['card'],
    default: ['card'],
  })
  @IsOptional()
  payment_method_types?: string[] = ['card'];

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @ApiPropertyOptional({
    description: 'Order ID for reference',
    example: 'order_123456',
  })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiPropertyOptional({
    description: 'Customer ID for reference',
    example: 'customer_123456',
  })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional({
    description: 'Payment description',
    example: 'Payment for Order #12345',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { orderId: '12345', productName: 'Premium Plan' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Automatic payment methods configuration',
    example: { enabled: true },
  })
  @IsOptional()
  @IsObject()
  automatic_payment_methods?: {
    enabled: boolean;
  } = { enabled: true };
}