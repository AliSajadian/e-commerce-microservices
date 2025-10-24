import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { NotificationTemplateService } from '../services';
import { CreateTemplateDto, UpdateTemplateDto, NotificationTemplateResponseDto } from '../dto';
import { JwtAuthGuard, AdminGuard } from '../guards'; 

@ApiTags('notification-templates')
@Controller('notification-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationTemplateController {
  constructor(
    private readonly notificationTemplateService: NotificationTemplateService,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create notification template (Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Template created successfully' 
  })
  async createTemplate(
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    const template = await this.notificationTemplateService.createTemplate(createTemplateDto);
    return new NotificationTemplateResponseDto(template);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notification templates' })
  @ApiResponse({ 
    status: 200, 
    description: 'Templates retrieved successfully' 
  })
  async getAllTemplates(): Promise<NotificationTemplateResponseDto[]> {
    const templates = await this.notificationTemplateService.getAllTemplates();
    return templates.map(template => new NotificationTemplateResponseDto(template));
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get template by name' })
  @ApiResponse({ 
    status: 200, 
    description: 'Template retrieved successfully' 
  })
  async getTemplate(
    @Param('name') name: string,
  ): Promise<NotificationTemplateResponseDto> {
    const template = await this.notificationTemplateService.getTemplate(name);
    return new NotificationTemplateResponseDto(template);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update notification template (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Template updated successfully' 
  })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<NotificationTemplateResponseDto> {
    const template = await this.notificationTemplateService.updateTemplate(id, updateTemplateDto);
    return new NotificationTemplateResponseDto(template);
  }
}
