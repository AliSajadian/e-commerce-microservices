// src/notification/services/notification-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../notification/entities';
import { NotificationStatus } from '../../notification/enums';

// Import the webhook event types
interface DeliveryEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  status: string;
  deliveryDelay?: number;
  smtpResponse?: string;
  bounceType?: 'hard' | 'soft';
  bounceSubType?: string;
  reason?: string;
  complaintType?: string;
}

interface BounceEventData {
  email: string;
  messageId: string;
  bounceType?: 'hard' | 'soft';
  bounceSubType?: string;
  timestamp: Date;
  reason?: string;
}

interface ComplaintEventData {
  email: string;
  messageId: string;
  complaintType?: string;
  timestamp: Date;
  userAgent?: string;
}

interface EmailOpenEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  userAgent?: string;
  ip?: string;
  location?: any;
}

interface EmailClickEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  url: string;
  userAgent?: string;
  ip?: string;
}

interface UnsubscribeEventData {
  messageId: string;
  email: string;
  timestamp: Date;
  eventId: string;
  unsubscribeType?: 'manual' | 'automatic';
}

@Injectable()
export class NotificationWebhookService {
  private readonly logger = new Logger(NotificationWebhookService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async updateNotificationStatus(eventData: DeliveryEventData): Promise<void> {
    try {
      const notification = await this.findNotificationByMessageId(eventData.messageId);

      if (!notification) {
        this.logger.warn('Notification not found for message ID', {
          messageId: eventData.messageId,
        });
        return;
      }

      let newStatus: NotificationStatus;
      let failureReason: string | null = null;
      let deliveredAt: Date | null = null;
      let failedAt: Date | null = null;

      switch (eventData.status) {
        case 'delivered':
          newStatus = NotificationStatus.DELIVERED;
          deliveredAt = eventData.timestamp;
          break;
        case 'bounced':
          newStatus = NotificationStatus.FAILED;
          failedAt = eventData.timestamp;
          failureReason = eventData.reason || 'Email bounced';
          break;
        case 'complained':
          newStatus = NotificationStatus.FAILED;
          failedAt = eventData.timestamp;
          failureReason = `Spam complaint: ${eventData.complaintType || 'Unknown'}`;
          break;
        default:
          newStatus = NotificationStatus.SENT;
      }

      await this.notificationRepository.update(notification.id, {
        status: newStatus,
        deliveredAt,
        failedAt,
        failureReason,
        updatedAt: new Date(),
        metadata: {
          ...notification.metadata,
          lastWebhookEvent: {
            eventId: eventData.eventId,
            type: eventData.status,
            timestamp: eventData.timestamp,
            deliveryDelay: eventData.deliveryDelay,
            smtpResponse: eventData.smtpResponse,
          } as any,
        },
      });

      this.logger.log('Notification status updated via webhook', {
        notificationId: notification.id,
        messageId: eventData.messageId,
        status: eventData.status,
      });

    } catch (error) {
      this.logger.error('Error updating notification status', {
        messageId: eventData.messageId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleBounce(bounceData: BounceEventData): Promise<void> {
    try {
      const notification = await this.findNotificationByMessageId(bounceData.messageId);

      if (!notification) {
        this.logger.warn('Notification not found for bounce event', {
          messageId: bounceData.messageId,
        });
        return;
      }

      await this.notificationRepository.update(notification.id, {
        status: NotificationStatus.FAILED,
        failedAt: bounceData.timestamp,
        failureReason: bounceData.reason || 'Email bounced',
        updatedAt: new Date(),
        metadata: {
          ...notification.metadata,
          bounce: {
            type: bounceData.bounceType,
            subType: bounceData.bounceSubType,
            reason: bounceData.reason,
            timestamp: bounceData.timestamp,
          },
        } as any,
      });

      if (bounceData.bounceType === 'hard') {
        await this.handleHardBounce(bounceData.email);
      }

      this.logger.log('Bounce event processed', {
        email: bounceData.email,
        bounceType: bounceData.bounceType,
        reason: bounceData.reason,
      });

    } catch (error) {
      this.logger.error('Error processing bounce event', {
        messageId: bounceData.messageId,
        error: error.message,
      });
      throw error;
    }
  }

  async handleComplaint(complaintData: ComplaintEventData): Promise<void> {
    try {
      const notification = await this.findNotificationByMessageId(complaintData.messageId);

      if (notification) {
        await this.notificationRepository.update(notification.id, {
          status: NotificationStatus.FAILED,
          failedAt: complaintData.timestamp,
          failureReason: `Spam complaint: ${complaintData.complaintType || 'Unknown'}`,
          updatedAt: new Date(),
          metadata: {
            ...notification.metadata,
            complaint: {
              type: complaintData.complaintType,
              timestamp: complaintData.timestamp,
              userAgent: complaintData.userAgent,
            },
          } as any,
        });
      }

      await this.handleSpamComplaint(complaintData.email);

      this.logger.log('Complaint event processed', {
        email: complaintData.email,
        complaintType: complaintData.complaintType,
      });

    } catch (error) {
      this.logger.error('Error processing complaint event', {
        messageId: complaintData.messageId,
        error: error.message,
      });
      throw error;
    }
  }

  async trackEmailOpen(openData: EmailOpenEventData): Promise<void> {
    try {
      const notification = await this.findNotificationByMessageId(openData.messageId);

      if (!notification) {
        return;
      }

      const currentOpens = notification.metadata?.opens || [];
      const newOpen = {
        timestamp: openData.timestamp,
        userAgent: openData.userAgent,
        ip: openData.ip,
        location: openData.location,
      };

      const updates: any = {
        updatedAt: new Date(),
        metadata: {
          ...notification.metadata,
          opens: [...currentOpens, newOpen],
          totalOpens: currentOpens.length + 1,
        },
      };

      if (!notification.metadata?.firstOpenedAt) {
        updates.metadata.firstOpenedAt = openData.timestamp;
      }

      await this.notificationRepository.update(notification.id, updates);

      this.logger.debug('Email open tracked', {
        messageId: openData.messageId,
        email: openData.email,
      });

    } catch (error) {
      this.logger.error('Error tracking email open', {
        messageId: openData.messageId,
        error: error.message,
      });
    }
  }

  async trackEmailClick(clickData: EmailClickEventData): Promise<void> {
    try {
      const notification = await this.findNotificationByMessageId(clickData.messageId);

      if (!notification) {
        return;
      }

      const currentClicks = notification.metadata?.clicks || [];
      const newClick = {
        url: clickData.url,
        timestamp: clickData.timestamp,
        userAgent: clickData.userAgent,
        ip: clickData.ip,
      };

      await this.notificationRepository.update(notification.id, {
        updatedAt: new Date(),
        metadata: {
          ...notification.metadata,
          clicks: [...currentClicks, newClick],
          totalClicks: currentClicks.length + 1,
        },
      });

      this.logger.debug('Email click tracked', {
        messageId: clickData.messageId,
        url: clickData.url,
      });

    } catch (error) {
      this.logger.error('Error tracking email click', {
        messageId: clickData.messageId,
        error: error.message,
      });
    }
  }

  async handleUnsubscribe(unsubscribeData: UnsubscribeEventData): Promise<void> {
    try {
      await this.processUnsubscribe(unsubscribeData.email);

      const notification = await this.findNotificationByMessageId(unsubscribeData.messageId);
      if (notification) {
        await this.notificationRepository.update(notification.id, {
          updatedAt: new Date(),
          metadata: {
            ...notification.metadata,
            unsubscribe: {
              type: unsubscribeData.unsubscribeType,
              timestamp: unsubscribeData.timestamp,
            },
          } as any,
        });
      }

      this.logger.log('Unsubscribe event processed', {
        email: unsubscribeData.email,
        type: unsubscribeData.unsubscribeType,
      });

    } catch (error) {
      this.logger.error('Error processing unsubscribe event', {
        email: unsubscribeData.email,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods
  private async findNotificationByMessageId(messageId: string): Promise<Notification | null> {
    try {
      return await this.notificationRepository.findOne({
        where: {
          providerMessageId: messageId, // Adjust based on your entity
        },
      });
    } catch (error) {
      this.logger.error('Error finding notification by message ID', {
        messageId,
        error: error.message,
      });
      return null;
    }
  }

  private async handleHardBounce(email: string): Promise<void> {
    // TODO: Implement your hard bounce logic
    // - Add to suppression list
    // - Update user preferences
    this.logger.debug('Processing hard bounce', { email });
  }

  private async handleSpamComplaint(email: string): Promise<void> {
    // TODO: Implement spam complaint logic
    // - Automatically unsubscribe
    // - Add to suppression list
    this.logger.debug('Processing spam complaint', { email });
  }

  private async processUnsubscribe(email: string): Promise<void> {
    // TODO: Implement unsubscribe logic
    // - Update user preferences
    // - Add to unsubscribe list
    this.logger.debug('Processing unsubscribe', { email });
  }
}