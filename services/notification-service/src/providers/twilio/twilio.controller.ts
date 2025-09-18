import { Controller, Post, Body, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwilioService } from './twilio.service';
import { TwilioSmsOptions, TwilioWhatsAppOptions, TwilioCallOptions } from './twilio.types';
import { JwtAuthGuard } from '../../notification/guards/jwt-auth.guard';

@ApiTags('Twilio Provider')
@Controller('providers/twilio')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TwilioController {
  private readonly logger = new Logger(TwilioController.name);

  constructor(private readonly twilioService: TwilioService) {}

  @Post('sms')
  @ApiOperation({ summary: 'Send SMS via Twilio' })
  @ApiResponse({ status: 200, description: 'SMS sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendSms(@Body() options: TwilioSmsOptions) {
    this.logger.log(`Sending SMS to ${options.to}`);
    return this.twilioService.sendSms(options);
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Send WhatsApp message via Twilio' })
  @ApiResponse({ status: 200, description: 'WhatsApp message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendWhatsApp(@Body() options: TwilioWhatsAppOptions) {
    this.logger.log(`Sending WhatsApp message to ${options.to}`);
    return this.twilioService.sendWhatsApp(options);
  }

  @Post('call')
  @ApiOperation({ summary: 'Make voice call via Twilio' })
  @ApiResponse({ status: 200, description: 'Call initiated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async makeCall(@Body() options: TwilioCallOptions) {
    this.logger.log(`Making call to ${options.to}`);
    return this.twilioService.makeCall(options);
  }

  @Get('message/:sid/status')
  @ApiOperation({ summary: 'Get message delivery status' })
  @ApiResponse({ status: 200, description: 'Message status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessageStatus(@Param('sid') sid: string) {
    this.logger.log(`Getting status for message SID: ${sid}`);
    return this.twilioService.getMessageStatus(sid);
  }
}