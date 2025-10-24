import { IsString, IsOptional, IsEnum, IsUUID, IsObject, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';


export class CreateNotificationFromTemplateDto {
  @ApiProperty({ description: 'Template name to use' })
  @IsString()
  templateName: string;

  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Variables to replace in template' })
  @IsObject()
  variables: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Override notification type',
    enum: NotificationType 
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Override action URL' })
  @IsOptional()
  @IsUrl()
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Override category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
