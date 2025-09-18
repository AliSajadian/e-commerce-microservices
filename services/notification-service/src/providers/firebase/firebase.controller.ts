import { Controller, Post, Body, Get, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FirebaseService } from './firebase.service';
import { FirebasePushNotificationOptions, FirebaseMulticastOptions } from './firebase.types';
import { JwtAuthGuard } from '../../notification/guards/jwt-auth.guard';

@ApiTags('Firebase Provider')
@Controller('providers/firebase')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FirebaseController {
  private readonly logger = new Logger(FirebaseController.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  @Post('push')
  @ApiOperation({ summary: 'Send push notification via Firebase' })
  @ApiResponse({ status: 200, description: 'Push notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendPushNotification(@Body() options: FirebasePushNotificationOptions) {
    this.logger.log('Sending push notification via Firebase');
    return this.firebaseService.sendPushNotification(options);
  }

  @Post('multicast')
  @ApiOperation({ summary: 'Send multicast push notification via Firebase' })
  @ApiResponse({ status: 200, description: 'Multicast notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendMulticastNotification(@Body() options: FirebaseMulticastOptions) {
    this.logger.log(`Sending multicast notification to ${options.tokens.length} devices`);
    return this.firebaseService.sendMulticastNotification(options);
  }

  @Post('topic/:topic/subscribe')
  @ApiOperation({ summary: 'Subscribe tokens to topic' })
  @ApiResponse({ status: 200, description: 'Tokens subscribed to topic successfully' })
  async subscribeToTopic(
    @Param('topic') topic: string,
    @Body('tokens') tokens: string[]
  ) {
    this.logger.log(`Subscribing ${tokens.length} tokens to topic: ${topic}`);
    return this.firebaseService.subscribeToTopic(tokens, topic);
  }

  @Post('topic/:topic/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe tokens from topic' })
  @ApiResponse({ status: 200, description: 'Tokens unsubscribed from topic successfully' })
  async unsubscribeFromTopic(
    @Param('topic') topic: string,
    @Body('tokens') tokens: string[]
  ) {
    this.logger.log(`Unsubscribing ${tokens.length} tokens from topic: ${topic}`);
    return this.firebaseService.unsubscribeFromTopic(tokens, topic);
  }

  @Get('token/:token/validate')
  @ApiOperation({ summary: 'Validate FCM token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async validateToken(@Param('token') token: string) {
    this.logger.log(`Validating FCM token: ${token.substring(0, 20)}...`);
    const isValid = await this.firebaseService.validateToken(token);
    return { token: token.substring(0, 20) + '...', isValid };
  }
}