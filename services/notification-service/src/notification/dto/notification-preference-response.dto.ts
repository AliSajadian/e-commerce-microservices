import { ApiProperty } from '@nestjs/swagger';
import { NotificationPreference } from '../entities/notification-preference.entity';

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  inAppEnabled: boolean;

  @ApiProperty()
  emailEnabled: boolean;

  @ApiProperty()
  pushEnabled: boolean;

  @ApiProperty()
  smsEnabled: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(preference: NotificationPreference) {
    this.id = preference.id;
    this.userId = preference.userId;
    this.category = preference.category;
    this.inAppEnabled = preference.inAppEnabled;
    this.emailEnabled = preference.emailEnabled;
    this.pushEnabled = preference.pushEnabled;
    this.smsEnabled = preference.smsEnabled;
    this.createdAt = preference.createdAt;
    this.updatedAt = preference.updatedAt;
  }
}
