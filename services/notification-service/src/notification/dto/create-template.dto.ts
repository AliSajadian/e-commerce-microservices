import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../enums/notification-type.enum';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Unique template name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Template title' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Template message with variables like {{userName}}' })
  @IsString()
  messageTemplate: string;

  @ApiProperty({ 
    description: 'Template type',
    enum: NotificationType,
    default: NotificationType.INFO 
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ description: 'Template category' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Is template active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Default metadata for template' })
  @IsOptional()
  @IsObject()
  defaultMetadata?: Record<string, any>;
}
