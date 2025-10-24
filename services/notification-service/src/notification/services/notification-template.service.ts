import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationTemplate } from '../entities';

@Injectable()
export class NotificationTemplateService {
  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
  ) {}

  async createTemplate(data: {
    name: string;
    title: string;
    messageTemplate: string;
    type: any;
    category?: string;
  }): Promise<NotificationTemplate> {
    const template = this.templateRepository.create(data);
    return await this.templateRepository.save(template);
  }

  async getTemplate(name: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { name, isActive: true }
    });

    if (!template) {
      throw new NotFoundException(`Template '${name}' not found`);
    }

    return template;
  }

  async renderTemplate(templateName: string, variables: Record<string, any>): Promise<{
    title: string;
    message: string;
  }> {
    const template = await this.getTemplate(templateName);
    
    let title = template.title;
    let message = template.messageTemplate;

    // Simple variable replacement (you might want to use a proper template engine like Handlebars)
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });

    return { title, message };
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    return await this.templateRepository.find({
      where: { isActive: true }
    });
  }

  async updateTemplate(id: string, updateTemplateDto: any): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id }
    });

    if (!template) {
      throw new NotFoundException(`Template with ID '${id}' not found`);
    }

    // Update only provided fields
    Object.assign(template, updateTemplateDto);

    return await this.templateRepository.save(template);
  }
}
