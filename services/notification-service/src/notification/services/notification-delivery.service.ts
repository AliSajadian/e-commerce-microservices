import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationDevice, Notification } from '../entities';

@Injectable()
export class NotificationDeliveryService {
  constructor(
    @InjectRepository(NotificationDevice)
    private deviceRepository: Repository<NotificationDevice>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async getUserDevices(userId: string): Promise<NotificationDevice[]> {
    return await this.deviceRepository.find({
      where: { 
        userId, 
        isActive: true 
      },
      order: { lastUsedAt: 'DESC' }
    });
  }

  async sendPushNotification(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user']
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const devices = await this.deviceRepository.find({
      where: { 
        userId: notification.userId, 
        isActive: true 
      }
    });

    // Send push notifications to all user devices
    for (const device of devices) {
      try {
        await this.sendToDevice(device, notification);
      } catch (error) {
        console.error(`Failed to send push notification to device ${device.id}:`, error);
      }
    }

    // Mark as sent
    await this.notificationRepository.update(notificationId, {
      isPushSent: true
    });
  }

  private async sendToDevice(device: NotificationDevice, notification: Notification): Promise<void> {
    // Implementation depends on your push notification service
    // (Firebase FCM, Apple Push Notification, etc.)
    console.log(`Sending push notification to device ${device.deviceToken}:`, {
      title: notification.title,
      message: notification.message
    });
  }

  async registerDevice(
    userId: string,
    deviceToken: string,
    deviceType: any,
    deviceName?: string
  ): Promise<NotificationDevice> {
    // Check if device already exists
    let device = await this.deviceRepository.findOne({
      where: { userId, deviceToken }
    });

    if (device) {
      device.isActive = true;
      device.lastUsedAt = new Date();
      device.deviceName = deviceName || device.deviceName;
    } else {
      device = this.deviceRepository.create({
        userId,
        deviceToken,
        deviceType,
        deviceName,
        lastUsedAt: new Date()
      });
    }

    return await this.deviceRepository.save(device);
  }

  async unregisterDevice(deviceId: string, userId: string): Promise<void> {
    const result = await this.deviceRepository.update(
      { 
        id: deviceId, 
        userId 
      },
      { 
        isActive: false 
      }
    );

    if (result.affected === 0) {
      throw new NotFoundException('Device not found or does not belong to user');
    }
  }
}
