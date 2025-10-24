import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { NotificationDeliveryService } from '../services';
import { RegisterDeviceDto, NotificationDeviceResponseDto } from '../dto';
import { JwtAuthGuard } from '../guards'; 
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('notification-devices')
@Controller('notification-devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationDeviceController {
  constructor(
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ 
    status: 201, 
    description: 'Device registered successfully' 
  })
  async registerDevice(
    @CurrentUser('sub') userId: string,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ): Promise<NotificationDeviceResponseDto> {
    const device = await this.notificationDeliveryService.registerDevice(
      userId,
      registerDeviceDto.deviceToken,
      registerDeviceDto.deviceType,
      registerDeviceDto.deviceName,
    );
    return new NotificationDeviceResponseDto(device);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my registered devices' })
  @ApiResponse({ 
    status: 200, 
    description: 'Devices retrieved successfully' 
  })
  async getMyDevices(
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationDeviceResponseDto[]> {
    const devices = await this.notificationDeliveryService.getUserDevices(userId);
    return devices.map(device => new NotificationDeviceResponseDto(device));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unregister device' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device unregistered successfully' 
  })
  async unregisterDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationDeliveryService.unregisterDevice(deviceId, userId);
    return { message: 'Device unregistered successfully' };
  }
}
