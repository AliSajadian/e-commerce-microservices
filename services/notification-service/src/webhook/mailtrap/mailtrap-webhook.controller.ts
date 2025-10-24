import {
  Controller,
  Post,
  Body,
  Headers,
  HttpStatus,
  HttpException,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { NotificationWebhookService } from './mailtrap.notification.webhook.service';
import { MailtrapWebhookService } from './mailtrap-webhook.service';
import {
  MailtrapWebhookPayload,
  MailtrapEventType,
  WebhookValidationResult,
} from './mailtrap-webhook.types';

@ApiTags('Webhooks - Mailtrap')
@Controller('webhooks/mailtrap')
export class MailtrapWebhookController {
  private readonly logger = new Logger(MailtrapWebhookController.name);

  constructor(
    private readonly notificationService: NotificationWebhookService,
    private readonly mailtrapWebhookService: MailtrapWebhookService,
  ) {}

  @Post('delivery')
  @ApiOperation({
    summary: 'Handle Mailtrap delivery webhook',
    description: 'Receives delivery status updates from Mailtrap',
  })
  @ApiHeader({
    name: 'X-MT-Signature',
    description: 'Mailtrap webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        processedEvents: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload or signature',
  })
  @ApiResponse({
    status: 401,
    description: 'Webhook signature verification failed',
  })
  async handleDeliveryWebhook(
    @Body() payload: MailtrapWebhookPayload,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      this.logger.log('Received Mailtrap delivery webhook', {
        eventsCount: payload.events?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Validate webhook signature
      const validationResult = await this.validateWebhookSignature(
        payload,
        headers,
      );

      if (!validationResult.isValid) {
        this.logger.error('Webhook signature validation failed', {
          reason: validationResult.error,
        });
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Validate payload structure
      if (!this.isValidPayload(payload)) {
        throw new BadRequestException('Invalid webhook payload structure');
      }

      // Process webhook events
      const processedEvents = await this.processWebhookEvents(payload.events);

      this.logger.log('Webhook processed successfully', {
        processedEvents,
      });

      return {
        success: true,
        message: 'Webhook processed successfully',
        processedEvents,
      };
    } catch (error) {
      this.logger.error('Error processing Mailtrap webhook', {
        error: error.message,
        stack: error.stack,
        payload: JSON.stringify(payload, null, 2),
      });

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new HttpException(
        'Internal server error processing webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bounce')
  @ApiOperation({
    summary: 'Handle Mailtrap bounce webhook',
    description: 'Receives bounce notifications from Mailtrap',
  })
  async handleBounceWebhook(
    @Body() payload: MailtrapWebhookPayload,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      this.logger.log('Received Mailtrap bounce webhook');

      const validationResult = await this.validateWebhookSignature(
        payload,
        headers,
      );

      if (!validationResult.isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      const processedEvents = await this.processBounceEvents(payload.events);

      return {
        success: true,
        message: 'Bounce webhook processed successfully',
        processedEvents,
      };
    } catch (error) {
      this.logger.error('Error processing bounce webhook', {
        error: error.message,
      });
      throw error;
    }
  }

  @Post('complaint')
  @ApiOperation({
    summary: 'Handle Mailtrap complaint webhook',
    description: 'Receives spam complaint notifications from Mailtrap',
  })
  async handleComplaintWebhook(
    @Body() payload: MailtrapWebhookPayload,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      this.logger.log('Received Mailtrap complaint webhook');

      const validationResult = await this.validateWebhookSignature(
        payload,
        headers,
      );

      if (!validationResult.isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }

      const processedEvents = await this.processComplaintEvents(payload.events);

      return {
        success: true,
        message: 'Complaint webhook processed successfully',
        processedEvents,
      };
    } catch (error) {
      this.logger.error('Error processing complaint webhook', {
        error: error.message,
      });
      throw error;
    }
  }

  private async validateWebhookSignature(
    payload: MailtrapWebhookPayload,
    headers: Record<string, string>,
  ): Promise<WebhookValidationResult> {
    const signature = headers['x-mt-signature'] || headers['X-MT-Signature'];

    if (!signature) {
      return {
        isValid: false,
        error: 'Missing webhook signature',
      };
    }

    return this.mailtrapWebhookService.validateSignature(
      JSON.stringify(payload),
      signature,
    );
  }

  private isValidPayload(payload: MailtrapWebhookPayload): boolean {
    return (
      payload &&
      Array.isArray(payload.events) &&
      payload.events.length > 0 &&
      payload.events.every((event) => event.type && event.email)
    );
  }

  private async processWebhookEvents(
    events: MailtrapWebhookPayload['events'],
  ): Promise<number> {
    let processedCount = 0;

    for (const event of events) {
      try {
        await this.processEvent(event);
        processedCount++;
      } catch (error) {
        this.logger.error('Error processing individual event', {
          eventId: event.event_id,
          eventType: event.type,
          error: error.message,
        });
        // Continue processing other events
      }
    }

    return processedCount;
  }

  private async processBounceEvents(
    events: MailtrapWebhookPayload['events'],
  ): Promise<number> {
    let processedCount = 0;

    for (const event of events) {
      try {
        if (event.type === MailtrapEventType.BOUNCE) {
          await this.notificationService.handleBounce({
            email: event.email,
            messageId: event.message_id,
            bounceType: event.bounce_type,
            bounceSubType: event.bounce_sub_type,
            timestamp: new Date(event.timestamp),
            reason: event.reason,
          });
          processedCount++;
        }
      } catch (error) {
        this.logger.error('Error processing bounce event', {
          eventId: event.event_id,
          error: error.message,
        });
      }
    }

    return processedCount;
  }

  private async processComplaintEvents(
    events: MailtrapWebhookPayload['events'],
  ): Promise<number> {
    let processedCount = 0;

    for (const event of events) {
      try {
        if (event.type === MailtrapEventType.COMPLAINT) {
          await this.notificationService.handleComplaint({
            email: event.email,
            messageId: event.message_id,
            complaintType: event.complaint_type,
            timestamp: new Date(event.timestamp),
            userAgent: event.user_agent,
          });
          processedCount++;
        }
      } catch (error) {
        this.logger.error('Error processing complaint event', {
          eventId: event.event_id,
          error: error.message,
        });
      }
    }

    return processedCount;
  }

  private async processEvent(event: any): Promise<void> {
    const eventData = {
      messageId: event.message_id,
      email: event.email,
      timestamp: new Date(event.timestamp),
      eventId: event.event_id,
    };

    switch (event.type) {
      case MailtrapEventType.DELIVERY:
        await this.notificationService.updateNotificationStatus({
          ...eventData,
          status: 'delivered',
          deliveryDelay: event.delivery_delay,
        });
        break;

      case MailtrapEventType.BOUNCE:
        await this.notificationService.updateNotificationStatus({
          ...eventData,
          status: 'bounced',
          bounceType: event.bounce_type,
          bounceSubType: event.bounce_sub_type,
          reason: event.reason,
        });
        break;

      case MailtrapEventType.OPEN:
        await this.notificationService.trackEmailOpen({
          ...eventData,
          userAgent: event.user_agent,
          ip: event.ip,
          location: event.location,
        });
        break;

      case MailtrapEventType.CLICK:
        await this.notificationService.trackEmailClick({
          ...eventData,
          url: event.url,
          userAgent: event.user_agent,
          ip: event.ip,
        });
        break;

      case MailtrapEventType.UNSUBSCRIBE:
        await this.notificationService.handleUnsubscribe({
          ...eventData,
          unsubscribeType: event.unsubscribe_type,
        });
        break;

      case MailtrapEventType.COMPLAINT:
        await this.notificationService.updateNotificationStatus({
          ...eventData,
          status: 'complained',
          complaintType: event.complaint_type,
        });
        break;

      default:
        this.logger.warn('Unknown event type received', {
          eventType: event.type,
          eventId: event.event_id,
        });
    }
  }
}