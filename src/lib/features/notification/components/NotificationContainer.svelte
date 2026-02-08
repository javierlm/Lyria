<script lang="ts">
  import Notification from './Notification.svelte';
  import { notificationStore } from '$lib/features/notification';
</script>

<div class="notification-container" aria-live="polite" aria-atomic="true">
  {#each notificationStore.notifications as notification (notification.id)}
    <Notification {notification} />
  {/each}
</div>

<style>
  .notification-container {
    position: fixed;
    top: max(env(safe-area-inset-top, 0px), 20px);
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
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
    .notification-container {
      top: max(env(safe-area-inset-top, 0px), 16px);
      left: 16px;
      right: 16px;
      max-width: none;
      width: auto;
    }
  }

  /* Extra small screens */
  @media (max-width: 380px) {
    .notification-container {
      left: 12px;
      right: 12px;
      gap: 8px;
    }
  }
</style>
