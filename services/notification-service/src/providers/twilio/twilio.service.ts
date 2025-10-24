import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { TwilioConfig, TwilioSmsOptions, TwilioCallOptions, TwilioWhatsAppOptions, TwilioMessageResponse } from './twilio.types';
import { SmsProviderInterface } from '../interfaces';
import { MessageListInstanceCreateOptions } from 'twilio/lib/rest/api/v2010/account/message';

@Injectable()
export class TwilioService implements SmsProviderInterface {
  private readonly logger = new Logger(TwilioService.name);
  private readonly twilioClient: Twilio;
  private readonly config: TwilioConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      accountSid: this.configService.get<string>('twilio.accountSid'),
      authToken: this.configService.get<string>('twilio.authToken'),
      phoneNumber: this.configService.get<string>('twilio.phoneNumber'),
      whatsappNumber: this.configService.get<string>('twilio.whatsappNumber'),
    };

    if (!this.config.accountSid || !this.config.authToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }

    this.twilioClient = new Twilio(this.config.accountSid, this.config.authToken);
    this.logger.log('Twilio service initialized successfully');
  }

  async sendSms(options: TwilioSmsOptions): Promise<TwilioMessageResponse> {
    try {
      this.validatePhoneNumber(options.to);

      const messageOptions: MessageListInstanceCreateOptions = {
        to: options.to,
        from: options.from || this.config.phoneNumber,
        body: options.body,
        // ...(options.mediaUrl && { mediaUrl: options.mediaUrl }),
        // ...(options.statusCallback && { statusCallback: options.statusCallback }),
        // ...(options.maxPrice && { maxPrice: options.maxPrice }),
        // ...(options.provideFeedback && { provideFeedback: options.provideFeedback }),
      };

           // Add optional parameters only if they exist
      if (options.mediaUrl) {
        messageOptions.mediaUrl = options.mediaUrl;
      }
      
      if (options.statusCallback) {
        messageOptions.statusCallback = options.statusCallback;
      }
      
      if (options.maxPrice !== undefined) {
        messageOptions.maxPrice = Number(options.maxPrice);
      }
      
      if (options.provideFeedback !== undefined) {
        messageOptions.provideFeedback = options.provideFeedback;
      }

      const message = await this.twilioClient.messages.create(messageOptions);

      this.logger.log(`SMS sent successfully. SID: ${message.sid}, To: ${options.to}`);

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}:`, error);
      
      if (error.code) {
        throw new BadRequestException(`Twilio Error ${error.code}: ${error.message}`);
      }
      
      throw new InternalServerErrorException('Failed to send SMS');
    }
  }

  async sendWhatsApp(options: TwilioWhatsAppOptions): Promise<TwilioMessageResponse> {
    try {
      if (!this.config.whatsappNumber) {
        throw new BadRequestException('WhatsApp number not configured');
      }

      this.validatePhoneNumber(options.to);

      const messageOptions = {
        to: `whatsapp:${options.to}`,
        from: options.from || this.config.whatsappNumber,
        body: options.body,
        ...(options.mediaUrl && { mediaUrl: options.mediaUrl }),
        ...(options.statusCallback && { statusCallback: options.statusCallback }),
      };

      const message = await this.twilioClient.messages.create(messageOptions);

      this.logger.log(`WhatsApp message sent successfully. SID: ${message.sid}, To: ${options.to}`);

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        price: message.price,
        priceUnit: message.priceUnit,
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${options.to}:`, error);
      
      if (error.code) {
        throw new BadRequestException(`Twilio Error ${error.code}: ${error.message}`);
      }
      
      throw new InternalServerErrorException('Failed to send WhatsApp message');
    }
  }

  async makeCall(options: TwilioCallOptions): Promise<any> {
    try {
      this.validatePhoneNumber(options.to);

      const callOptions = {
        to: options.to,
        from: options.from || this.config.phoneNumber,
        url: options.url,
        method: options.method || 'POST',
        ...(options.statusCallback && { statusCallback: options.statusCallback }),
        ...(options.timeout && { timeout: options.timeout }),
      };

      const call = await this.twilioClient.calls.create(callOptions);

      this.logger.log(`Call initiated successfully. SID: ${call.sid}, To: ${options.to}`);
      return call;
    } catch (error) {
      this.logger.error(`Failed to make call to ${options.to}:`, error);
      
      if (error.code) {
        throw new BadRequestException(`Twilio Error ${error.code}: ${error.message}`);
      }
      
      throw new InternalServerErrorException('Failed to make call');
    }
  }

  async getMessageStatus(messageSid: string): Promise<any> {
    try {
      const message = await this.twilioClient.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      this.logger.error(`Failed to get message status for SID ${messageSid}:`, error);
      throw new InternalServerErrorException('Failed to get message status');
    }
  }

  async validateWebhookSignature(signature: string, url: string, params: any): Promise<boolean> {
    try {
      const authToken = this.config.authToken;
      const { validateRequest } = require('twilio'); //this.twilioClient.validateRequest
      const isValid = validateRequest(authToken, signature, url, params);
      return isValid;
    } catch (error) {
      this.logger.error('Failed to validate webhook signature:', error);
      return false;
    }
  }

  // Implementation of SmsProviderInterface
  async send(to: string, message: string, options?: any): Promise<any> {
    return this.sendSms({
      to,
      body: message,
      ...options,
    });
  }

  async getDeliveryStatus(messageId: string): Promise<any> {
    return this.getMessageStatus(messageId);
  }

  private validatePhoneNumber(phoneNumber: string): void {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new BadRequestException('Invalid phone number format. Must be in E.164 format (e.g., +1234567890)');
    }
  }
}