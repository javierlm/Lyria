export { default as NotificationComponent } from './components/Notification.svelte';
export { default as NotificationContainer } from './components/NotificationContainer.svelte';
export { notificationStore, notificationRegistry, notify } from './stores/notificationStore.svelte';
export type {
  Notification,
  NotificationType,
  NotificationCreateOptions,
  NotificationAction,
  NotificationPosition,
  NotificationTypeConfig
} from './types';
export {
  DEFAULT_NOTIFICATION_DURATION,
  DEFAULT_MAX_NOTIFICATIONS,
  DEFAULT_NOTIFICATION_POSITION
} from './types';
export { registerDefaultNotificationTypes } from './notificationTypes';
export { notifyPwaUpdate, type PwaUpdateContext } from './pwaNotification';
