export { default as NotificationComponent } from './components/Notification.svelte';
export { default as NotificationContainer } from './components/NotificationContainer.svelte';
export { notificationStore, notify } from './stores/notificationStore.svelte';
export type { Notification, NotificationType, NotificationOptions } from './types';
export { DEFAULT_NOTIFICATION_DURATION, DEFAULT_MAX_NOTIFICATIONS } from './types';
