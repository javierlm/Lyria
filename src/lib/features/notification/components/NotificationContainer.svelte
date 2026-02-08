<script lang="ts">
  import Notification from './Notification.svelte';
  import { notificationStore } from '$lib/features/notification';
  import type { NotificationPosition } from '$lib/features/notification/types';

  const positions: NotificationPosition[] = [
    'top-left',
    'top-right',
    'top-center',
    'bottom-left',
    'bottom-right',
    'bottom-center'
  ];

  const notificationsByPosition = $derived(
    positions.reduce(
      (acc, position) => {
        acc[position] = notificationStore.notifications.filter((n) => n.position === position);
        return acc;
      },
      {} as Record<NotificationPosition, typeof notificationStore.notifications>
    )
  );

  function getPositionStyles(position: NotificationPosition): string {
    const styles: Record<NotificationPosition, string> = {
      'top-right': 'top: max(env(safe-area-inset-top, 0px), 20px); right: 20px;',
      'top-left': 'top: max(env(safe-area-inset-top, 0px), 20px); left: 20px;',
      'top-center':
        'top: max(env(safe-area-inset-top, 0px), 20px); left: 50%; transform: translateX(-50%);',
      'bottom-right': 'bottom: max(env(safe-area-inset-bottom, 0px), 20px); right: 20px;',
      'bottom-left': 'bottom: max(env(safe-area-inset-bottom, 0px), 20px); left: 20px;',
      'bottom-center':
        'bottom: max(env(safe-area-inset-bottom, 0px), 20px); left: 50%; transform: translateX(-50%);'
    };
    return styles[position];
  }

  function getFlexDirection(position: NotificationPosition): string {
    return position.startsWith('bottom') ? 'column-reverse' : 'column';
  }
</script>

{#each positions as position (position)}
  {#if notificationsByPosition[position].length > 0}
    <div
      class="notification-container position-{position.replace('-', '_')}"
      style="{getPositionStyles(position)} flex-direction: {getFlexDirection(position)};"
      aria-live="polite"
      aria-atomic="true"
    >
      {#each notificationsByPosition[position] as notification (notification.id)}
        <Notification {notification} />
      {/each}
    </div>
  {/if}
{/each}

<style>
  .notification-container {
    position: fixed;
    z-index: 9999;
    display: flex;
    gap: 12px;
    max-width: 400px;
    width: 100%;
    pointer-events: none;
  }

  .notification-container > :global(*) {
    pointer-events: auto;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .notification-container.position-top_right,
    .notification-container.position-top_left,
    .notification-container.position-top_center {
      top: max(env(safe-area-inset-top, 0px), 16px) !important;
      left: 16px !important;
      right: 16px !important;
      max-width: none;
      width: auto;
      transform: none !important;
    }

    .notification-container.position-bottom_right,
    .notification-container.position-bottom_left,
    .notification-container.position-bottom_center {
      bottom: max(env(safe-area-inset-bottom, 0px), 16px) !important;
      left: 16px !important;
      right: 16px !important;
      max-width: none;
      width: auto;
      transform: none !important;
    }
  }

  /* Extra small screens */
  @media (max-width: 380px) {
    .notification-container {
      left: 12px !important;
      right: 12px !important;
      gap: 8px;
    }
  }
</style>
