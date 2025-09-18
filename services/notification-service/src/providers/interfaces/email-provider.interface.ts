export interface EmailProviderInterface {
  send(to: string | string[], subject: string, content: string, options?: any): Promise<any>;
  sendTemplate(templateId: string, to: string | string[], variables?: Record<string, any>): Promise<any>;
  getDeliveryStatus(messageId: string): Promise<any>;
}