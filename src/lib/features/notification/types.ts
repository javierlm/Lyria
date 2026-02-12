import type { Component } from 'svelte';

export type NotificationType =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'pwa-update'
  | 'favorite-added'
  | 'favorite-removed';
export type NotificationPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface NotificationAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration: number | null;
  createdAt: number;
  position: NotificationPosition;
  actions?: NotificationAction[];
}

export interface NotificationCreateOptions {
  duration?: number | null;
  position?: NotificationPosition;
  actions?: NotificationAction[];
}

export interface NotificationTypeConfig {
  id: string;
  icon: Component;
  defaultDuration: number | null;
  defaultPosition: NotificationPosition;
  styleClass: string;
}

export interface NotificationRegistry {
  register(config: NotificationTypeConfig): void;
  get(id: string): NotificationTypeConfig | undefined;
  has(id: string): boolean;
}

export const DEFAULT_NOTIFICATION_DURATION = 5000;
export const DEFAULT_MAX_NOTIFICATIONS = 5;
export const DEFAULT_NOTIFICATION_POSITION: NotificationPosition = 'top-right';
