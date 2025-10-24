export interface NotificationAnalytics {
  dailyStats: { date: string; count: number }[];
  topCategories: { category: string; count: number }[];
  deliveryStats: { pushSent: number; emailSent: number; total: number };
}