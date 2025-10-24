export interface PushProviderInterface {
  send(tokens: string | string[], title: string, body: string, data?: Record<string, any>): Promise<any>;
  sendToTopic(topic: string, title: string, body: string, data?: Record<string, any>): Promise<any>;
}