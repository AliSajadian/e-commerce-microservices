export interface KafkaUserEventData {
  eventType: 'user.created' | 'user.updated' | 'user.deleted';
  timestamp: string;
  data: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
    isActive?: boolean;
    preferredLanguage?: string;
    timezone?: string;
  };
}