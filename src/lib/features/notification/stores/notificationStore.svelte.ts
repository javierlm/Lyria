import type {
  Notification,
  NotificationType,
  NotificationCreateOptions,
  NotificationTypeConfig
} from '$lib/features/notification/types';
import {
  DEFAULT_NOTIFICATION_DURATION,
  DEFAULT_MAX_NOTIFICATIONS,
  DEFAULT_NOTIFICATION_POSITION
} from '$lib/features/notification/types';

class NotificationTypeRegistry {
  private readonly types = new Map<string, NotificationTypeConfig>();

  register(config: NotificationTypeConfig): void {
    this.types.set(config.id, config);
  }

  get(id: string): NotificationTypeConfig | undefined {
    return this.types.get(id);
  }

  has(id: string): boolean {
    return this.types.has(id);
  }
}

export const notificationRegistry = new NotificationTypeRegistry();

class NotificationStore {
  notifications = $state<Notification[]>([]);
  maxNotifications = $state(DEFAULT_MAX_NOTIFICATIONS);

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  setMaxNotifications(max: number): void {
    this.maxNotifications = max;
  }

  create(
    type: NotificationType,
    title: string,
    message: string,
    options?: NotificationCreateOptions
  ): string {
    const id = this.generateId();

    const typeConfig = notificationRegistry.get(type);

    const duration =
      options?.duration === undefined
        ? (typeConfig?.defaultDuration ?? DEFAULT_NOTIFICATION_DURATION)
        : options.duration;

    const position =
      options?.position ?? typeConfig?.defaultPosition ?? DEFAULT_NOTIFICATION_POSITION;

    const notification: Notification = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now(),
      position,
      actions: options?.actions
    };

    this.notifications = [notification, ...this.notifications].slice(0, this.maxNotifications);

    return id;
  }

  add(
    type: NotificationType,
    title: string,
    message: string,
    options?: NotificationCreateOptions
  ): string {
    return this.create(type, title, message, options);
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
  }

  clear(): void {
    this.notifications = [];
  }

  success(
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create('success', title, message, {
      ...options,
      duration: DEFAULT_NOTIFICATION_DURATION
    });
  }

  info(
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create('info', title, message, {
      ...options,
      duration: DEFAULT_NOTIFICATION_DURATION
    });
  }

  warning(
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create('warning', title, message, {
      ...options,
      duration: DEFAULT_NOTIFICATION_DURATION
    });
  }

  error(
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create('error', title, message, {
      ...options,
      duration: DEFAULT_NOTIFICATION_DURATION
    });
  }

  favoriteAdded(
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create('favorite-added', title, message, {
      ...options,
      duration: DEFAULT_NOTIFICATION_DURATION
    });
  }

  favoriteRemoved(
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create('favorite-removed', title, message, {
      ...options,
      duration: DEFAULT_NOTIFICATION_DURATION
    });
  }

  persistent(
    type: NotificationType,
    title: string,
    message: string,
    options?: Omit<NotificationCreateOptions, 'duration'>
  ): string {
    return this.create(type, title, message, {
      ...options,
      duration: null
    });
  }
}

export const notificationStore = new NotificationStore();

export const notify = {
  create: notificationStore.create.bind(notificationStore),
  add: notificationStore.add.bind(notificationStore),
  remove: notificationStore.remove.bind(notificationStore),
  clear: notificationStore.clear.bind(notificationStore),
  setMaxNotifications: notificationStore.setMaxNotifications.bind(notificationStore),
  success: notificationStore.success.bind(notificationStore),
  info: notificationStore.info.bind(notificationStore),
  warning: notificationStore.warning.bind(notificationStore),
  error: notificationStore.error.bind(notificationStore),
  favoriteAdded: notificationStore.favoriteAdded.bind(notificationStore),
  favoriteRemoved: notificationStore.favoriteRemoved.bind(notificationStore),
  persistent: notificationStore.persistent.bind(notificationStore)
};
