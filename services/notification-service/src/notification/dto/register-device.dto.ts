import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType } from '../enums/device-type.enum';

export class RegisterDeviceDto {
  @ApiProperty({ description: 'Device push notification token' })
  @IsString()
  deviceToken: string;

  @ApiProperty({ 
    description: 'Type of device',
    enum: DeviceType 
  })
  @IsEnum(DeviceType)
  deviceType: DeviceType;

  @ApiPropertyOptional({ description: 'Human-readable device name' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

