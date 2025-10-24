import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationType } from '../enums/notification-type.enum';

export class NotificationTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  messageTemplate: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  defaultMetadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(template: NotificationTemplate) {
    this.id = template.id;
    this.name = template.name;
    this.title = template.title;
    this.messageTemplate = template.messageTemplate;
    this.type = template.type;
    this.category = template.category;
    this.isActive = template.isActive;
    this.defaultMetadata = template.defaultMetadata;
    this.createdAt = template.createdAt;
    this.updatedAt = template.updatedAt;
  }
}


