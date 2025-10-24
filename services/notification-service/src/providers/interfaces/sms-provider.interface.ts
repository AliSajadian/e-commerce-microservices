export interface SmsProviderInterface {
  send(to: string, message: string, options?: any): Promise<any>;
  getDeliveryStatus(messageId: string): Promise<any>;
}