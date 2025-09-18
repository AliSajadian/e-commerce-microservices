import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WebhookValidationResult } from './mailtrap-webhook.types';

@Injectable()
export class MailtrapWebhookService {
  private readonly logger = new Logger(MailtrapWebhookService.name);
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('MAILTRAP_WEBHOOK_SECRET');
  }

  validateSignature(payload: string, signature: string): WebhookValidationResult {
    try {
      if (!this.webhookSecret) {
        this.logger.error('Mailtrap webhook secret not configured');
        return {
          isValid: false,
          error: 'Webhook secret not configured',
        };
      }

      // Mailtrap uses HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );

      return {
        isValid,
        error: isValid ? null : 'Signature mismatch',
      };
    } catch (error) {
      this.logger.error('Error validating webhook signature', {
        error: error.message,
      });
      return {
        isValid: false,
        error: 'Signature validation error',
      };
    }
  }

  parseWebhookPayload(rawPayload: string): any {
    try {
      return JSON.parse(rawPayload);
    } catch (error) {
      this.logger.error('Error parsing webhook payload', {
        error: error.message,
      });
      throw new Error('Invalid JSON payload');
    }
  }
}
