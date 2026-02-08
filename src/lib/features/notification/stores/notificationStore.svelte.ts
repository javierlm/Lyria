import type {
  Notification,
  NotificationType,
  NotificationOptions
} from '$lib/features/notification/types';
import {
  DEFAULT_NOTIFICATION_DURATION,
  DEFAULT_MAX_NOTIFICATIONS
} from '$lib/features/notification/types';

class NotificationStore {
  notifications = $state<Notification[]>([]);
  maxNotifications = $state(DEFAULT_MAX_NOTIFICATIONS);

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  setMaxNotifications(max: number): void {
    this.maxNotifications = max;
  }

  add(type: NotificationType, title: string, message: string, options?: NotificationOptions): void {
    const id = this.generateId();
    const duration = options?.duration ?? DEFAULT_NOTIFICATION_DURATION;

    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now()
    };

    this.notifications = [notification, ...this.notifications].slice(0, this.maxNotifications);
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  clear(): void {
    this.notifications = [];
  }

  success(title: string, message: string, options?: NotificationOptions): void {
    this.add('success', title, message, options);
  }

  info(title: string, message: string, options?: NotificationOptions): void {
    this.add('info', title, message, options);
  }

  warning(title: string, message: string, options?: NotificationOptions): void {
    this.add('warning', title, message, options);
  }

  error(title: string, message: string, options?: NotificationOptions): void {
    this.add('error', title, message, options);
  }
}

export const notificationStore = new NotificationStore();

export const notify = {
  success: notificationStore.success.bind(notificationStore),
  info: notificationStore.info.bind(notificationStore),
  warning: notificationStore.warning.bind(notificationStore),
  error: notificationStore.error.bind(notificationStore),
  add: notificationStore.add.bind(notificationStore),
  remove: notificationStore.remove.bind(notificationStore),
  clear: notificationStore.clear.bind(notificationStore),
  setMaxNotifications: notificationStore.setMaxNotifications.bind(notificationStore)
};
