import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateNotificationDto } from '../dto';
import { Notification, User, NotificationServiceUser } from '../entities';
import { NotificationType, NotificationStatus } from '../enums';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationStats, NotificationAnalytics } from '../interfaces';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    // @InjectRepository(Notification)
    // private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NotificationServiceUser)
    private notificationServiceUserRepository: Repository<NotificationServiceUser>,
  ) {}

  // Core notification operations
  async createNotification(data: CreateNotificationDto): Promise<Notification> {
    // Check if user exists and is active
    const user = await this.userRepository.findOne({
      where: { id: data.userId, isActive: true }
    }) as any;
    
    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    // Check notification limits
    const serviceUser = await this.notificationServiceUserRepository.findOne({
      where: { userId: data.userId }
    });

    if (serviceUser && !this.canSendNotification(serviceUser)) {
      throw new Error('Daily notification limit reached');
    }

    const notification = this.notificationRepository.create({
      ...data,
      type: data.type || NotificationType.INFO,
    });

    return await this.notificationRepository.save(notification);
  }

  async getUserNotifications(
    userId: string,
    options: {
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
      category?: string;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (options.status) {
      query.andWhere('notification.status = :status', { status: options.status });
    }

    if (options.category) {
      query.andWhere('notification.category = :category', { category: options.category });
    }

    if (options.limit) {
      query.take(options.limit);
    }

    if (options.offset) {
      query.skip(options.offset);
    }

    const [notifications, total] = await query.getManyAndCount();
    return { notifications, total };
  }

  async getNotificationById(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { 
        id: notificationId, 
        userId 
      },
      relations: ['user']
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.update(
      { id: notificationId, userId },
      { 
        status: NotificationStatus.READ, 
        readAt: new Date() 
      }
    );

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.UNREAD },
      { 
        status: NotificationStatus.READ, 
        readAt: new Date() 
      }
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { 
        userId, 
        status: NotificationStatus.UNREAD 
      }
    });
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId
    });

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  private canSendNotification(serviceUser: NotificationServiceUser): boolean {
    if (!serviceUser.globalNotificationsEnabled) {
      return false;
    }

    // Check daily limits
    const today = new Date().toDateString();
    const lastNotificationDate = serviceUser.lastNotificationDate?.toDateString();
    
    if (lastNotificationDate !== today) {
      // Reset counter for new day
      return true;
    }

    return serviceUser.todayNotificationCount < serviceUser.maxNotificationsPerDay;
  }

    // Complex operations - use custom repository methods
  async getUserNotificationsAdvanced(
    userId: string,
    searchOptions: {
      status?: NotificationStatus[];
      searchTerm?: string;
      categories?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number }> {
    return await this.notificationRepository.findWithAdvancedSearch(userId, searchOptions);
  }

  async getUserStats(userId: string): Promise<NotificationStats> {
    return await this.notificationRepository.getUserStats(userId);
  }

  async markCategoryAsRead(
    userId: string, 
    categories: string[]
  ): Promise<{ updatedCount: number }> {
    const updatedCount = await this.notificationRepository.markMultipleAsRead(userId, { categories });
    return { updatedCount };
  }

  async getAnalytics(userId?: string): Promise<NotificationAnalytics> {
    return await this.notificationRepository.getAnalytics(userId);
  }

  // Background job method
  async cleanupOldNotifications(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.notificationRepository.cleanupExpiredNotifications();
    return { deletedCount };
  }
}