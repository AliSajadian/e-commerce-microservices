// src/types/email.types.ts
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
}

export enum EmailType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_SHIPPED = 'order_shipped',
  NEWSLETTER = 'newsletter',
  NOTIFICATION = 'notification'
}

export interface EmailJob {
  id: string;
  type: EmailType;
  recipient: string;
  data: any;
  scheduledAt?: Date;
  attempts: number;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}