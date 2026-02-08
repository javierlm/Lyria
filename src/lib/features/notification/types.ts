export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration: number;
  createdAt: number;
}

export interface NotificationOptions {
  duration?: number;
}

export const DEFAULT_NOTIFICATION_DURATION = 5000;
export const DEFAULT_MAX_NOTIFICATIONS = 5;
