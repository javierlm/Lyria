import CheckCircleIcon from 'phosphor-svelte/lib/CheckCircleIcon';
import InfoIcon from 'phosphor-svelte/lib/InfoIcon';
import WarningIcon from 'phosphor-svelte/lib/WarningIcon';
import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
import ArrowClockwiseIcon from 'phosphor-svelte/lib/ArrowClockwiseIcon';
import HeartIcon from 'phosphor-svelte/lib/HeartIcon';
import HeartBreakIcon from 'phosphor-svelte/lib/HeartBreakIcon';
import { notificationRegistry } from './stores/notificationStore.svelte';
import type { NotificationTypeConfig } from './types';
import { DEFAULT_NOTIFICATION_DURATION, DEFAULT_NOTIFICATION_POSITION } from './types';

export const defaultNotificationTypes: NotificationTypeConfig[] = [
  {
    id: 'success',
    icon: CheckCircleIcon,
    defaultDuration: DEFAULT_NOTIFICATION_DURATION,
    defaultPosition: DEFAULT_NOTIFICATION_POSITION,
    styleClass: 'notification-success'
  },
  {
    id: 'info',
    icon: InfoIcon,
    defaultDuration: DEFAULT_NOTIFICATION_DURATION,
    defaultPosition: DEFAULT_NOTIFICATION_POSITION,
    styleClass: 'notification-info'
  },
  {
    id: 'warning',
    icon: WarningIcon,
    defaultDuration: DEFAULT_NOTIFICATION_DURATION,
    defaultPosition: DEFAULT_NOTIFICATION_POSITION,
    styleClass: 'notification-warning'
  },
  {
    id: 'error',
    icon: WarningCircleIcon,
    defaultDuration: DEFAULT_NOTIFICATION_DURATION,
    defaultPosition: DEFAULT_NOTIFICATION_POSITION,
    styleClass: 'notification-error'
  },
  {
    id: 'pwa-update',
    icon: ArrowClockwiseIcon,
    defaultDuration: null,
    defaultPosition: 'bottom-right',
    styleClass: 'notification-info'
  },
  {
    id: 'favorite-added',
    icon: HeartIcon,
    defaultDuration: DEFAULT_NOTIFICATION_DURATION,
    defaultPosition: DEFAULT_NOTIFICATION_POSITION,
    styleClass: 'notification-favorite-added'
  },
  {
    id: 'favorite-removed',
    icon: HeartBreakIcon,
    defaultDuration: DEFAULT_NOTIFICATION_DURATION,
    defaultPosition: DEFAULT_NOTIFICATION_POSITION,
    styleClass: 'notification-favorite-removed'
  }
];

export function registerDefaultNotificationTypes(): void {
  defaultNotificationTypes.forEach((type) => {
    notificationRegistry.register(type);
  });
}
