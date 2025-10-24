// controllers/notification.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';

import { 
  NotificationService, 
  NotificationTemplateService 
} from '../services';
import { 
  CreateNotificationDto,
  CreateNotificationFromTemplateDto,
  NotificationResponseDto,
  GetNotificationsQueryDto
 } from '../dto';
import { JwtAuthGuard } from '../guards'; 
import { CurrentUser } from '../decorators/current-user.decorator'; 

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationTemplateService: NotificationTemplateService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  @ApiResponse({ 
    status: 201, 
    description: 'Notification created successfully',
    type: NotificationResponseDto 
  })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.createNotification(createNotificationDto);
    return new NotificationResponseDto(notification);
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create notification from template' })
  @ApiResponse({ 
    status: 201, 
    description: 'Notification created from template successfully',
    type: NotificationResponseDto 
  })
  async createNotificationFromTemplate(
    @Body() createFromTemplateDto: CreateNotificationFromTemplateDto,
  ): Promise<NotificationResponseDto> {
    const { title, message } = await this.notificationTemplateService.renderTemplate(
      createFromTemplateDto.templateName,
      createFromTemplateDto.variables
    );

    const notification = await this.notificationService.createNotification({
      userId: createFromTemplateDto.userId,
      title,
      message,
      type: createFromTemplateDto.type,
      category: createFromTemplateDto.category,
      actionUrl: createFromTemplateDto.actionUrl,
      metadata: createFromTemplateDto.metadata,
    });

    return new NotificationResponseDto(notification);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'status', required: false, enum: ['unread', 'read', 'archived'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ 
    status: 200, 
    description: 'User notifications retrieved successfully' 
  })
  async getUserNotifications(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetNotificationsQueryDto,
  ) {
    const result = await this.notificationService.getUserNotifications(userId, query);
    
    return {
      data: result.notifications.map(notification => new NotificationResponseDto(notification)),
      total: result.total,
      limit: query.limit || null,
      offset: query.offset || 0,
    };
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  @ApiResponse({ 
    status: 200, 
    description: 'Unread count retrieved successfully' 
  })
  async getUnreadCount(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiQuery({ name: 'status', required: false, enum: ['unread', 'read', 'archived'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query() query: GetNotificationsQueryDto,
  ) {
    const result = await this.notificationService.getUserNotifications(userId, query);
    
    return {
      data: result.notifications.map(notification => new NotificationResponseDto(notification)),
      total: result.total,
      limit: query.limit || null,
      offset: query.offset || 0,
    };
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'Get my unread notifications count' })
  async getMyUnreadCount(
    @CurrentUser('sub') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Put(':id/mark-read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.markAsRead(notificationId, userId);
    return { message: 'Notification marked as read' };
  }

  @Put('user/:userId/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Put('me/mark-all-read')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  async markMyNotificationsAsRead(
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.markAllAsRead(userId);
    return { message: 'All notifications marked as read' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.notificationService.deleteNotification(notificationId, userId);
    return { message: 'Notification deleted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notification retrieved successfully',
    type: NotificationResponseDto 
  })
  async getNotificationById(
    @Param('id', ParseUUIDPipe) notificationId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.getNotificationById(notificationId, userId);
    return new NotificationResponseDto(notification);
  }
}


