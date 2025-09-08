import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationStatus } from '../enums/notification-status.enum';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty()
  userId: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  actionUrl?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiProperty()
  isPushSent: boolean;

  @ApiProperty()
  isEmailSent: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(notification: Notification) {
    this.id = notification.id;
    this.title = notification.title;
    this.message = notification.message;
    this.type = notification.type;
    this.status = notification.status;
    this.userId = notification.userId;
    this.metadata = notification.metadata;
    this.actionUrl = notification.actionUrl;
    this.category = notification.category;
    this.readAt = notification.readAt;
    this.expiresAt = notification.expiresAt;
    this.isPushSent = notification.isPushSent;
    this.isEmailSent = notification.isEmailSent;
    this.createdAt = notification.createdAt;
    this.updatedAt = notification.updatedAt;
  }
}
