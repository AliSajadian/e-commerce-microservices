import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '../enums/device-type.enum';
import { NotificationDevice } from '../entities/notification-device.entity';


export class NotificationDeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  deviceToken: string;

  @ApiProperty({ enum: DeviceType })
  deviceType: DeviceType;

  @ApiPropertyOptional()
  deviceName?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastUsedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(device: NotificationDevice) {
    this.id = device.id;
    this.userId = device.userId;
    this.deviceToken = device.deviceToken;
    this.deviceType = device.deviceType;
    this.deviceName = device.deviceName;
    this.isActive = device.isActive;
    this.lastUsedAt = device.lastUsedAt;
    this.createdAt = device.createdAt;
    this.updatedAt = device.updatedAt;
  }
}


