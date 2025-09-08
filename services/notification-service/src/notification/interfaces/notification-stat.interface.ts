import { NotificationType } from "../enums";

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<string, number>;
}

