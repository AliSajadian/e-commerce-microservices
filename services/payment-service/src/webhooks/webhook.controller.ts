import { 
  Controller, 
  Post, 
  Req, 
  Res, 
  Headers, 
  RawBodyRequest, 
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      this.logger.log('Received Stripe webhook');

      if (!signature) {
        this.logger.error('Missing stripe-signature header');
        return res.status(HttpStatus.BAD_REQUEST).send('Missing stripe-signature header');
      }

      // Get raw body
      const rawBody = req.rawBody || req.body;
      
      if (!rawBody) {
        this.logger.error('Missing request body');
        return res.status(HttpStatus.BAD_REQUEST).send('Missing request body');
      }

      // Process the webhook
      await this.webhookService.handleStripeEvent(rawBody, signature);

      this.logger.log('Webhook processed successfully');
      return res.status(HttpStatus.OK).send('OK');
      
    } catch (error) {
      this.logger.error('Error processing webhook:', error.message);
      
      if (error.message.includes('signature verification failed')) {
        return res.status(HttpStatus.BAD_REQUEST).send('Invalid signature');
      }
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
  }

  @Post('stripe/test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  async testWebhook(@Res() res: Response) {
    this.logger.log('Test webhook endpoint called');
    return res.status(HttpStatus.OK).json({
      message: 'Webhook endpoint is working',
      timestamp: new Date().toISOString(),
    });
  }
}