import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, UserSyncEvent, NotificationServiceUser } from '../entities';
import { UserSyncEventType, UserSyncStatus } from '../enums';

@Injectable()
export class UserSyncService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserSyncEvent)
    private userSyncEventRepository: Repository<UserSyncEvent>,
    @InjectRepository(NotificationServiceUser)
    private notificationServiceUserRepository: Repository<NotificationServiceUser>,
  ) {}

  async handleUserCreated(userData: any): Promise<void> {
    const syncEvent = this.userSyncEventRepository.create({
      userId: userData.id,
      eventType: UserSyncEventType.USER_CREATED,
      userData,
    });

    await this.userSyncEventRepository.save(syncEvent);
    await this.processUserCreated(userData, syncEvent.id);
  }

  async handleUserUpdated(userData: any): Promise<void> {
    const syncEvent = this.userSyncEventRepository.create({
      userId: userData.id,
      eventType: UserSyncEventType.USER_UPDATED,
      userData,
    });

    await this.userSyncEventRepository.save(syncEvent);
    await this.processUserUpdated(userData, syncEvent.id);
  }

  async handleUserDeleted(userId: string): Promise<void> {
    const syncEvent = this.userSyncEventRepository.create({
      userId,
      eventType: UserSyncEventType.USER_DELETED,
      userData: { id: userId },
    });

    await this.userSyncEventRepository.save(syncEvent);
    await this.processUserDeleted(userId, syncEvent.id);
  }

  private async processUserCreated(userData: any, syncEventId: string): Promise<void> {
    try {
      // Create user
      const user = this.userRepository.create({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        avatar: userData.avatar,
        isActive: userData.isActive,
        preferredLanguage: userData.preferredLanguage,
        timezone: userData.timezone,
        lastSyncedAt: new Date(),
      });

      await this.userRepository.save(user);

      // Create notification service user with defaults
      const serviceUser = this.notificationServiceUserRepository.create({
        userId: userData.id,
      });

      await this.notificationServiceUserRepository.save(serviceUser);

      await this.markSyncEventAsProcessed(syncEventId);
    } catch (error) {
      await this.markSyncEventAsFailed(syncEventId, error.message);
    }
  }

  private async processUserUpdated(userData: any, syncEventId: string): Promise<void> {
    try {
      await this.userRepository.update(
        { id: userData.id },
        {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avatar: userData.avatar,
          isActive: userData.isActive,
          preferredLanguage: userData.preferredLanguage,
          timezone: userData.timezone,
          lastSyncedAt: new Date(),
        }
      );

      await this.markSyncEventAsProcessed(syncEventId);
    } catch (error) {
      await this.markSyncEventAsFailed(syncEventId, error.message);
    }
  }

  private async processUserDeleted(userId: string, syncEventId: string): Promise<void> {
    try {
      // Soft delete or handle according to your business logic
      await this.userRepository.update(
        { id: userId },
        { isActive: false, lastSyncedAt: new Date() }
      );

      await this.markSyncEventAsProcessed(syncEventId);
    } catch (error) {
      await this.markSyncEventAsFailed(syncEventId, error.message);
    }
  }

  private async markSyncEventAsProcessed(syncEventId: string): Promise<void> {
    await this.userSyncEventRepository.update(syncEventId, {
      status: UserSyncStatus.PROCESSED,
      processedAt: new Date(),
    });
  }

  private async markSyncEventAsFailed(syncEventId: string, errorMessage: string): Promise<void> {
    await this.userSyncEventRepository.update(syncEventId, {
      status: UserSyncStatus.FAILED,
      errorMessage,
      processedAt: new Date(),
    });
  }
}
