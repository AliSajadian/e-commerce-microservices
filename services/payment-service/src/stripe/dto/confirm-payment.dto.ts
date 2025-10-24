import { IsNotEmpty, IsString, IsOptional, IsObject, IsUrl, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Payment Intent ID from Stripe',
    example: 'pi_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  payment_intent_id: string;

  @ApiPropertyOptional({
    description: 'Payment Method ID',
    example: 'pm_1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({
    description: 'Return URL after successful payment',
    example: 'https://your-website.com/success',
  })
  @IsOptional()
  @IsUrl()
  return_url?: string;

  @ApiPropertyOptional({
    description: 'Use Stripe Elements for payment confirmation',
    default: false,
  })
  @IsOptional()
  use_stripe_sdk?: boolean;
}

export class PaymentMethodDto {
  @ApiProperty({
    description: 'Payment method type',
    example: 'card',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Card details',
    example: {
      number: '4242424242424242',
      exp_month: 12,
      exp_year: 2025,
      cvc: '123',
    },
  })
  @IsObject()
  card: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };

  @ApiPropertyOptional({
    description: 'Billing details',
    example: {
      name: 'John Doe',
      email: 'john@example.com',
      address: {
        line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US',
      },
    },
  })
  @IsOptional()
  @IsObject()
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

export class ConfirmPaymentWithMethodDto extends ConfirmPaymentDto {
  @ApiProperty({
    description: 'Payment method details',
  })
  @IsObject()
  payment_method_data: PaymentMethodDto;
}

export class ConfirmPaymentWithDataDto {
  @ApiProperty({
    description: 'Payment Intent ID from Stripe',
    example: 'pi_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  payment_intent_id: string;

  @ApiProperty({
    description: 'Payment method data',
    type: PaymentMethodDto,
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PaymentMethodDto)
  payment_method_data: PaymentMethodDto;

  @ApiPropertyOptional({
    description: 'Return URL after successful payment',
    example: 'https://your-website.com/success',
  })
  @IsOptional()
  @IsUrl()
  return_url?: string;

  @ApiPropertyOptional({
    description: 'Use Stripe Elements for payment confirmation',
    default: false,
  })
  @IsOptional()
  use_stripe_sdk?: boolean;
}


