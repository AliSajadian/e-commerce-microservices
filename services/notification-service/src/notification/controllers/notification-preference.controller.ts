import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { NotificationPreferenceService } from '../services';
import { UpdatePreferenceDto } from '../dto';
import { NotificationPreferenceResponseDto } from '../dto';
import { JwtAuthGuard } from '../guards'; 
import { CurrentUser } from '../decorators/current-user.decorator'; 

@ApiTags('notification-preferences')
@Controller('notification-preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationPreferenceController {
  constructor(
    private readonly notificationPreferenceService: NotificationPreferenceService,
  ) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences retrieved successfully' 
  })
  async getUserPreferences(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.notificationPreferenceService.getUserPreferences(userId);
    return preferences.map(pref => new NotificationPreferenceResponseDto(pref));
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my notification preferences' })
  async getMyPreferences(
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.notificationPreferenceService.getUserPreferences(userId);
    return preferences.map(pref => new NotificationPreferenceResponseDto(pref));
  }

  @Put('user/:userId/category/:category')
  @ApiOperation({ summary: 'Update user notification preference for category' })
  @ApiResponse({ 
    status: 200, 
    description: 'Preference updated successfully' 
  })
  async updateUserPreference(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('category') category: string,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.notificationPreferenceService.updatePreference(
      userId,
      category,
      updatePreferenceDto,
    );
    return new NotificationPreferenceResponseDto(preference);
  }

  @Put('me/category/:category')
  @ApiOperation({ summary: 'Update my notification preference for category' })
  async updateMyPreference(
    @CurrentUser('sub') userId: string,
    @Param('category') category: string,
    @Body() updatePreferenceDto: UpdatePreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.notificationPreferenceService.updatePreference(
      userId,
      category,
      updatePreferenceDto,
    );
    return new NotificationPreferenceResponseDto(preference);
  }
}
