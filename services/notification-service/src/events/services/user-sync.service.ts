// src/events/services/user-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { User, UserSyncEvent } from '../../notification/entities';
import { UserSyncEventType, UserSyncStatus } from '../../notification/enums';
import { KafkaUserEventData } from '../interfaces/user-event.interface';

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(UserSyncEvent)
    private readonly userSyncEventRepository: Repository<UserSyncEvent>,
  ) {}

  async handleUserEvent(eventData: KafkaUserEventData): Promise<void> {
    // Create sync event record for tracking
    const syncEvent = this.userSyncEventRepository.create({
      userId: eventData.data.id,
      eventType: this.mapEventType(eventData.eventType),
      userData: eventData.data,
      status: UserSyncStatus.PENDING,
    });

    try {
      await this.userSyncEventRepository.save(syncEvent);

      switch (eventData.eventType) {
        case 'user.created':
          await this.handleUserCreated(eventData.data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(eventData.data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(eventData.data.id);
          break;
        default:
          throw new Error(`Unknown event type: ${eventData.eventType}`);
      }

      // Mark as processed
      syncEvent.status = UserSyncStatus.PROCESSED;
      syncEvent.processedAt = new Date();
      await this.userSyncEventRepository.save(syncEvent);

      this.logger.log(`Successfully processed ${eventData.eventType} for user ${eventData.data.id}`);

    } catch (error) {
      this.logger.error(`Failed to process ${eventData.eventType} for user ${eventData.data.id}:`, error);

      // Update sync event with error
      syncEvent.status = UserSyncStatus.FAILED;
      syncEvent.errorMessage = error.message;
      syncEvent.retryCount += 1;
      await this.userSyncEventRepository.save(syncEvent);

      // Re-throw for retry mechanism
      throw error;
    }
  }

  private async handleUserCreated(userData: KafkaUserEventData['data']): Promise<void> {
    this.logger.log(`Processing user created event for user: ${userData.id}`);
    
    // Check if user already exists to avoid duplicates
    const existingUser = await this.userRepository.findOne({ 
      where: { id: userData.id } 
    });
    
    if (existingUser) {
      this.logger.warn(`User ${userData.id} already exists, updating instead`);
      await this.syncUserData(userData);
      return;
    }

    // Create new user
    await this.syncUserData(userData);
    
    const user = await this.userRepository.findOne({ where: { id: userData.id } });
    
    // Notification-specific logic for new users
    await this.sendWelcomeNotification(user);
    await this.setupUserNotificationPreferences(user);
  }

  private async handleUserUpdated(userData: KafkaUserEventData['data']): Promise<void> {
    this.logger.log(`Processing user updated event for user: ${userData.id}`);
    
    const existingUser = await this.userRepository.findOne({ 
      where: { id: userData.id } 
    });
    
    if (!existingUser) {
      this.logger.warn(`User ${userData.id} not found for update, creating new user`);
      await this.handleUserCreated(userData);
      return;
    }

    // Update user
    await this.syncUserData(userData);
    
    const updatedUser = await this.userRepository.findOne({ where: { id: userData.id } });
    
    // Send profile update notification if needed
    await this.sendProfileUpdateNotification(updatedUser);
  }

  private async syncUserData(userData: KafkaUserEventData['data']): Promise<void> {
    // Map auth-service fields to notification-service fields
    const mappedData = {
      id: userData.id,
      email: userData.email || userData.username,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      avatar: userData.avatar || null,
      isActive: userData.isActive ?? true,
      preferredLanguage: userData.preferredLanguage || null,
      timezone: userData.timezone || null,
      lastSyncedAt: new Date(),
    };

    // Upsert user data
    await this.userRepository.upsert(mappedData, {
      conflictPaths: ['id'],
      skipUpdateIfNoValuesChanged: true,
    });

    this.logger.log(`User ${userData.id} synced successfully`);
  }

  private async handleUserDeleted(userId: string): Promise<void> {
    this.logger.log(`Processing user deleted event for user: ${userId}`);
    
    const existingUser = await this.userRepository.findOne({ 
      where: { id: userId },
      relations: ['notifications']
    });
    
    if (!existingUser) {
      this.logger.warn(`User ${userId} not found for deletion`);
      return;
    }

    // Clean up related notifications first
    await this.cleanupUserNotifications(existingUser);

    // Soft delete or mark as inactive
    await this.userRepository.update(
      { id: userId },
      { isActive: false, lastSyncedAt: new Date() }
    );

    this.logger.log(`User ${userId} marked as inactive`);

    // Send goodbye notification if needed
    await this.sendGoodbyeNotification(existingUser);
  }

  private mapEventType(kafkaEventType: string): UserSyncEventType {
    switch (kafkaEventType) {
      case 'user.created':
        return UserSyncEventType.USER_CREATED;
      case 'user.updated':
        return UserSyncEventType.USER_UPDATED;
      case 'user.deleted':
        return UserSyncEventType.USER_DELETED;
      default:
        return UserSyncEventType.USER_UPDATED;
    }
  }

  // Notification-specific methods
  private async sendWelcomeNotification(user: User): Promise<void> {
    try {
      this.logger.log(`Sending welcome notification to user ${user.id}`);
      
      // TODO: Implement with NotificationService
      // await this.notificationService.createNotification({
      //   userId: user.id,
      //   type: 'welcome',
      //   title: `Welcome ${user.firstName}!`,
      //   message: 'Welcome to our platform!',
      //   channels: ['in-app', 'email']
      // });
      
    } catch (error) {
      this.logger.error(`Failed to send welcome notification to user ${user.id}: ${error.message}`);
    }
  }

  private async setupUserNotificationPreferences(user: User): Promise<void> {
    try {
      this.logger.log(`Setting up notification preferences for user ${user.id}`);
      
      // TODO: Implement with NotificationPreferencesService
      // await this.notificationPreferencesService.createDefaults({
      //   userId: user.id,
      //   email: true,
      //   sms: false,
      //   push: true,
      //   inApp: true
      // });
      
    } catch (error) {
      this.logger.error(`Failed to setup notification preferences for user ${user.id}: ${error.message}`);
    }
  }

  private async sendProfileUpdateNotification(user: User): Promise<void> {
    try {
      this.logger.log(`Sending profile update notification to user ${user.id}`);
      
      // TODO: Implement profile update notification logic
      
    } catch (error) {
      this.logger.error(`Failed to send profile update notification to user ${user.id}: ${error.message}`);
    }
  }

  private async cleanupUserNotifications(user: User): Promise<void> {
    try {
      this.logger.log(`Cleaning up notifications for user ${user.id}`);
      
      // TODO: Implement notification cleanup logic
      
    } catch (error) {
      this.logger.error(`Failed to cleanup notifications for user ${user.id}: ${error.message}`);
    }
  }

  private async sendGoodbyeNotification(user: User): Promise<void> {
    try {
      this.logger.log(`Sending goodbye notification for user ${user.id}`);
      
      // TODO: Implement goodbye notification logic
      
    } catch (error) {
      this.logger.error(`Failed to send goodbye notification for user ${user.id}: ${error.message}`);
    }
  }

  // Retry failed sync events (existing method)
  async retryFailedSyncEvents(): Promise<void> {
    const failedEvents = await this.userSyncEventRepository.find({
      where: {
        status: UserSyncStatus.FAILED,
        retryCount: LessThan(3),
      },
      order: { createdAt: 'ASC' },
      take: 100,
    });

    for (const event of failedEvents) {
      try {
        const eventData: KafkaUserEventData = {
          eventType: event.eventType as any,
          timestamp: event.createdAt.toISOString(),
          data: event.userData as any,
        };

        await this.handleUserEvent(eventData);
      } catch (error) {
        this.logger.error(`Retry failed for sync event ${event.id}:`, error);
      }
    }
  }
}