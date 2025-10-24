// repositories/notification.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Notification } from '../entities';
import { NotificationStatus, NotificationType } from '../enums';
import { NotificationStats, NotificationAnalytics } from '../interfaces';


@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  /**
   * Get user notification statistics
   * This would be complex with basic repository methods
   */
  async getUserStats(userId: string): Promise<NotificationStats> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'unread' THEN 1 END) as unread,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
        COUNT(CASE WHEN type = 'info' THEN 1 END) as info_count,
        COUNT(CASE WHEN type = 'warning' THEN 1 END) as warning_count,
        COUNT(CASE WHEN type = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN type = 'success' THEN 1 END) as success_count,
        COUNT(CASE WHEN type = 'system' THEN 1 END) as system_count,
        COUNT(CASE WHEN type = 'user_action' THEN 1 END) as user_action_count
      FROM notifications 
      WHERE "userId" = $1 AND "createdAt" > NOW() - INTERVAL '30 days'
    `;

    const result = await this.dataSource.query(query, [userId]);
    const row = result[0];

    // Get category stats separately
    const categoryQuery = `
      SELECT category, COUNT(*) as count
      FROM notifications 
      WHERE "userId" = $1 AND category IS NOT NULL 
        AND "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `;

    const categoryResults = await this.dataSource.query(categoryQuery, [userId]);

    return {
      total: parseInt(row.total),
      unread: parseInt(row.unread),
      read: parseInt(row.read),
      byType: {
        [NotificationType.INFO]: parseInt(row.info_count),
        [NotificationType.WARNING]: parseInt(row.warning_count),
        [NotificationType.ERROR]: parseInt(row.error_count),
        [NotificationType.SUCCESS]: parseInt(row.success_count),
        [NotificationType.SYSTEM]: parseInt(row.system_count),
        [NotificationType.USER_ACTION]: parseInt(row.user_action_count),
      },
      byCategory: categoryResults.reduce((acc, row) => {
        acc[row.category] = parseInt(row.count);
        return acc;
      }, {})
    };
  }

  /**
   * Get notifications with advanced filtering and search
   * Much more complex than basic findAndCount
   */
  async findWithAdvancedSearch(
    userId: string,
    options: {
      status?: NotificationStatus[];
      types?: NotificationType[];
      categories?: string[];
      searchTerm?: string;
      dateFrom?: Date;
      dateTo?: Date;
      hasActionUrl?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number }> {
    const query = this.createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    // Apply filters
    if (options.status?.length) {
      query.andWhere('notification.status IN (:...statuses)', { statuses: options.status });
    }

    if (options.types?.length) {
      query.andWhere('notification.type IN (:...types)', { types: options.types });
    }

    if (options.categories?.length) {
      query.andWhere('notification.category IN (:...categories)', { categories: options.categories });
    }

    if (options.searchTerm) {
      query.andWhere(
        '(LOWER(notification.title) LIKE LOWER(:searchTerm) OR LOWER(notification.message) LIKE LOWER(:searchTerm))',
        { searchTerm: `%${options.searchTerm}%` }
      );
    }

    if (options.dateFrom) {
      query.andWhere('notification.createdAt >= :dateFrom', { dateFrom: options.dateFrom });
    }

    if (options.dateTo) {
      query.andWhere('notification.createdAt <= :dateTo', { dateTo: options.dateTo });
    }

    if (options.hasActionUrl !== undefined) {
      if (options.hasActionUrl) {
        query.andWhere('notification.actionUrl IS NOT NULL');
      } else {
        query.andWhere('notification.actionUrl IS NULL');
      }
    }

    // Apply pagination
    if (options.limit) {
      query.take(options.limit);
    }

    if (options.offset) {
      query.skip(options.offset);
    }

    const [notifications, total] = await query.getManyAndCount();

    return { notifications, total };
  }

  /**
   * Bulk update notifications with complex conditions
   */
  async markMultipleAsRead(
    userId: string,
    filters: {
      categories?: string[];
      types?: NotificationType[];
      olderThan?: Date;
    }
  ): Promise<number> {
    let query = this.createQueryBuilder()
      .update(Notification)
      .set({ 
        status: NotificationStatus.READ, 
        readAt: new Date() 
      })
      .where('userId = :userId', { userId })
      .andWhere('status = :status', { status: NotificationStatus.UNREAD });

    if (filters.categories?.length) {
      query = query.andWhere('category IN (:...categories)', { categories: filters.categories });
    }

    if (filters.types?.length) {
      query = query.andWhere('type IN (:...types)', { types: filters.types });
    }

    if (filters.olderThan) {
      query = query.andWhere('createdAt < :olderThan', { olderThan: filters.olderThan });
    }

    const result = await query.execute();
    return result.affected || 0;
  }

  /**
   * Get notification analytics for admin dashboard
   */
  async getAnalytics(userId?: string, days: number = 30): Promise<NotificationAnalytics> {
    const userCondition = userId ? 'AND "userId" = $2' : '';
    const params = userId ? [days, userId] : [days];

    // Daily stats
    const dailyStatsQuery = `
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM notifications 
      WHERE "createdAt" > NOW() - INTERVAL '${days} days' ${userCondition}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;

    const dailyStats = await this.dataSource.query(dailyStatsQuery, params);

    // Top categories
    const topCategoriesQuery = `
      SELECT 
        category,
        COUNT(*) as count
      FROM notifications 
      WHERE "createdAt" > NOW() - INTERVAL '${days} days' 
        AND category IS NOT NULL ${userCondition}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `;

    const topCategories = await this.dataSource.query(topCategoriesQuery, params);

    // Delivery stats
    const deliveryStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN "isPushSent" = true THEN 1 END) as push_sent,
        COUNT(CASE WHEN "isEmailSent" = true THEN 1 END) as email_sent
      FROM notifications 
      WHERE "createdAt" > NOW() - INTERVAL '${days} days' ${userCondition}
    `;

    const deliveryStats = await this.dataSource.query(deliveryStatsQuery, params);

    return {
      dailyStats: dailyStats.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      })),
      topCategories: topCategories.map(row => ({
        category: row.category,
        count: parseInt(row.count)
      })),
      deliveryStats: {
        total: parseInt(deliveryStats[0].total),
        pushSent: parseInt(deliveryStats[0].push_sent),
        emailSent: parseInt(deliveryStats[0].email_sent)
      }
    };
  }

  /**
   * Clean up expired notifications
   * Complex logic that benefits from custom repository
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await this.createQueryBuilder()
      .delete()
      .from(Notification)
      .where('expiresAt IS NOT NULL AND expiresAt < NOW()')
      .orWhere('createdAt < NOW() - INTERVAL \'1 year\' AND status = :archivedStatus', { 
        archivedStatus: NotificationStatus.ARCHIVED 
      })
      .execute();

    return result.affected || 0;
  }

  /**
   * Find notifications that need to be sent via push/email
   * Complex business logic
   */
  async findPendingDelivery(
    deliveryType: 'push' | 'email',
    limit: number = 100
  ): Promise<Notification[]> {
    const isPushSentField = deliveryType === 'push' ? 'isPushSent' : 'isEmailSent';
    
    return this.createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .where(`notification.${isPushSentField} = false`)
      .andWhere('notification.createdAt > NOW() - INTERVAL \'24 hours\'')
      .andWhere('user.isActive = true')
      .orderBy('notification.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }
}