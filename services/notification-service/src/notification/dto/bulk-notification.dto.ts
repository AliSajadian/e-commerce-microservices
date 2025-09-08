import { IsArray, IsString, IsOptional, IsEnum, IsObject, IsUrl, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

class NotificationRecipientDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'User-specific variables for template' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}

export class BulkNotificationDto {
  @ApiProperty({ description: 'List of recipients' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationRecipientDto)
  @ArrayMinSize(1)
  recipients: NotificationRecipientDto[];

  @ApiProperty({ description: 'Notification title or template name' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ 
    description: 'Notification type',
    enum: NotificationType,
    default: NotificationType.INFO 
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Action URL for notification' })
  @IsOptional()
  @IsUrl()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Notification category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Common metadata for all notifications' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}


