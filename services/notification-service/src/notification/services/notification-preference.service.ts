import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreference } from '../entities';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return await this.preferenceRepository.find({
      where: { userId }
    });
  }

  async updatePreference(
    userId: string,
    category: string,
    preferences: {
      inAppEnabled?: boolean;
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      smsEnabled?: boolean;
    }
  ): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { userId, category }
    });

    if (!preference) {
      preference = this.preferenceRepository.create({
        userId,
        category,
        ...preferences
      });
    } else {
      Object.assign(preference, preferences);
    }

    return await this.preferenceRepository.save(preference);
  }

  async canSendNotification(
    userId: string,
    category: string,
    channel: 'inApp' | 'email' | 'push' | 'sms'
  ): Promise<boolean> {
    const preference = await this.preferenceRepository.findOne({
      where: { userId, category }
    });

    if (!preference) {
      return true; // Default to enabled if no preference set
    }

    switch (channel) {
      case 'inApp':
        return preference.inAppEnabled;
      case 'email':
        return preference.emailEnabled;
      case 'push':
        return preference.pushEnabled;
      case 'sms':
        return preference.smsEnabled;
      default:
        return false;
    }
  }
}