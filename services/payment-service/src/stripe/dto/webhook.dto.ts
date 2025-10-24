import { IsNotEmpty, IsString, IsObject, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StripeWebhookDto {
  @ApiProperty({
    description: 'Stripe event ID',
    example: 'evt_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Event type',
    example: 'payment_intent.succeeded',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Event data',
  })
  @IsNotEmpty()
  @IsObject()
  data: {
    object: any;
    previous_attributes?: any;
  };

  @ApiProperty({
    description: 'Timestamp when the event was created',
    example: 1640995200,
  })
  @IsNotEmpty()
  @IsNumber()
  created: number;

  @ApiPropertyOptional({
    description: 'Whether the event is in live mode',
    example: false,
  })
  @IsOptional()
  livemode?: boolean;

  @ApiPropertyOptional({
    description: 'Number of times the webhook has been attempted',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  pending_webhooks?: number;

  @ApiPropertyOptional({
    description: 'Request details',
  })
  @IsOptional()
  @IsObject()
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

export class PaymentIntentWebhookData {
  @ApiProperty({
    description: 'Payment Intent object from Stripe',
  })
  @IsObject()
  object: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    client_secret: string;
    customer?: string;
    description?: string;
    metadata?: Record<string, any>;
    payment_method?: string;
    receipt_email?: string;
    created: number;
    updated?: number;
  };
}

export class WebhookEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.created',
      'payment_intent.processing',
      'payment_intent.requires_action',
      'charge.succeeded',
      'charge.failed',
      'customer.created',
      'customer.updated',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ],
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Event data containing the Stripe object',
  })
  @IsNotEmpty()
  @IsObject()
  data: PaymentIntentWebhookData;

  @ApiProperty({
    description: 'Event ID',
    example: 'evt_1234567890abcdef',
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}