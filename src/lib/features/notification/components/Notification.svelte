<script lang="ts">
  import type { Notification as NotificationType } from '$lib/features/notification/types';
  import { notificationStore } from '$lib/features/notification';
  import LL from '$i18n/i18n-svelte';
  import CheckCircle from 'phosphor-svelte/lib/CheckCircle';
  import Info from 'phosphor-svelte/lib/Info';
  import Warning from 'phosphor-svelte/lib/Warning';
  import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
  import X from 'phosphor-svelte/lib/X';

  interface Props {
    notification: NotificationType;
  }

  let { notification }: Props = $props();

  let isClosing = $state(false);
  let progressWidth = $state(100);

  const iconComponents = {
    success: CheckCircle,
    info: Info,
    warning: Warning,
    error: WarningCircle
  };

  function closeNotification() {
    isClosing = true;
    setTimeout(() => {
      notificationStore.remove(notification.id);
    }, 300);
  }

  $effect(() => {
    if (notification.duration > 0) {
      let animationFrameId: number;
      const endTime = notification.createdAt + notification.duration;

      const updateProgress = () => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        progressWidth = (remaining / notification.duration) * 100;

        if (remaining > 0) {
          animationFrameId = requestAnimationFrame(updateProgress);
        } else {
          closeNotification();
        }
      };

      animationFrameId = requestAnimationFrame(updateProgress);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  });
</script>

<div
  class="notification {notification.type}"
  class:closing={isClosing}
  role="alert"
  aria-live="polite"
>
  <div class="notification-content-wrapper">
    <div class="notification-icon">
      {#if notification.type === 'success'}
        <CheckCircle weight="fill" />
      {:else if notification.type === 'info'}
        <Info weight="fill" />
      {:else if notification.type === 'warning'}
        <Warning weight="fill" />
      {:else if notification.type === 'error'}
        <WarningCircle weight="fill" />
      {/if}
    </div>
    <div class="notification-content">
      <div class="notification-title">{notification.title}</div>
      <div class="notification-message">{notification.message}</div>
    </div>
    <button
      class="notification-close"
      onclick={closeNotification}
      aria-label={$LL.notifications.close()}
    >
      <X weight="bold" />
    </button>
  </div>

  {#if notification.duration > 0}
    <div class="notification-progress-bar-wrapper">
      <div class="notification-progress-fill" style="width: {progressWidth}%;"></div>
    </div>
    <div class="notification-progress-circle" style="--progress: {progressWidth};"></div>
  {/if}
</div>

<style>
  .notification {
    background: var(--card-background, #ffffff);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease;
    position: relative;
    overflow: visible;
    border-left: 5px solid;
    transition: all 0.3s ease;
  }

  :global(html.dark-mode) .notification {
    box-shadow:
      0 10px 30px var(--darker-shadow-color, rgba(0, 0, 0, 0.5)),
      0 0 0 1px var(--border-color, rgba(255, 255, 255, 0.1));
  }

  .notification.closing {
    animation: slideOut 0.3s ease forwards;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  /* Types */
  .notification.success {
    border-left-color: #10b981;
    background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
    box-shadow:
      0 10px 30px rgba(16, 185, 129, 0.15),
      0 0 0 1px rgba(16, 185, 129, 0.2),
      0 0 12px rgba(16, 185, 129, 0.1);
  }

  .notification.info {
    border-left-color: #3b82f6;
    background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
    box-shadow:
      0 10px 30px rgba(59, 130, 246, 0.15),
      0 0 0 1px rgba(59, 130, 246, 0.2),
      0 0 12px rgba(59, 130, 246, 0.1);
  }

  .notification.warning {
    border-left-color: #f59e0b;
    background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
    box-shadow:
      0 10px 30px rgba(245, 158, 11, 0.15),
      0 0 0 1px rgba(245, 158, 11, 0.2),
      0 0 12px rgba(245, 158, 11, 0.1);
  }

  .notification.error {
    border-left-color: #ef4444;
    background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
    box-shadow:
      0 10px 30px rgba(239, 68, 68, 0.15),
      0 0 0 1px rgba(239, 68, 68, 0.2),
      0 0 12px rgba(239, 68, 68, 0.1);
  }

  :global(html.dark-mode) .notification.success {
    background: linear-gradient(135deg, #0d2818 0%, #1a2f23 100%);
    box-shadow:
      0 10px 30px rgba(16, 185, 129, 0.2),
      0 0 8px rgba(16, 185, 129, 0.12);
    border-right: 1px solid rgba(16, 185, 129, 0.4);
    border-top: 1px solid rgba(16, 185, 129, 0.4);
    border-bottom: 1px solid rgba(16, 185, 129, 0.4);
  }

  :global(html.dark-mode) .notification.info {
    background: linear-gradient(135deg, #0f1f3d 0%, #1a2844 100%);
    box-shadow:
      0 10px 30px rgba(59, 130, 246, 0.2),
      0 0 8px rgba(59, 130, 246, 0.12);
    border-right: 1px solid rgba(59, 130, 246, 0.4);
    border-top: 1px solid rgba(59, 130, 246, 0.4);
    border-bottom: 1px solid rgba(59, 130, 246, 0.4);
  }

  :global(html.dark-mode) .notification.warning {
    background: linear-gradient(135deg, #2d2410 0%, #3d3010 100%);
    box-shadow:
      0 10px 30px rgba(245, 158, 11, 0.2),
      0 0 8px rgba(245, 158, 11, 0.12);
    border-right: 1px solid rgba(245, 158, 11, 0.4);
    border-top: 1px solid rgba(245, 158, 11, 0.4);
    border-bottom: 1px solid rgba(245, 158, 11, 0.4);
  }

  :global(html.dark-mode) .notification.error {
    background: linear-gradient(135deg, #2d1010 0%, #3d1a1a 100%);
    box-shadow:
      0 10px 30px rgba(239, 68, 68, 0.2),
      0 0 8px rgba(239, 68, 68, 0.12);
    border-right: 1px solid rgba(239, 68, 68, 0.4);
    border-top: 1px solid rgba(239, 68, 68, 0.4);
    border-bottom: 1px solid rgba(239, 68, 68, 0.4);
  }

  .notification-content-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
    padding-bottom: 24px;
  }

  /* Icon */
  .notification-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .notification.success .notification-icon {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  .notification.info .notification-icon {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  .notification.warning .notification-icon {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  .notification.error .notification-icon {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }

  .notification-icon :global(svg) {
    width: 24px;
    height: 24px;
    color: white;
  }

  /* Content */
  .notification-content {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-color, #1f2937);
    margin-bottom: 4px;
    line-height: 1.3;
  }

  :global(html.dark-mode) .notification-title {
    color: #f3f4f6;
  }

  .notification-message {
    font-size: 14px;
    color: var(--text-color, #6b7280);
    line-height: 1.5;
    opacity: 0.8;
  }

  :global(html.dark-mode) .notification-message {
    color: #9ca3af;
  }

  /* Close button */
  .notification-close {
    width: 32px;
    height: 32px;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s ease;
    padding: 0;
  }

  :global(html.dark-mode) .notification-close {
    background: rgba(255, 255, 255, 0.1);
  }

  .notification-close:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
  }

  :global(html.dark-mode) .notification-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .notification-close :global(svg) {
    width: 16px;
    height: 16px;
    color: var(--text-color, #6b7280);
  }

  :global(html.dark-mode) .notification-close :global(svg) {
    color: #9ca3af;
  }

  /* Progress bar */
  .notification-progress-bar-wrapper {
    box-sizing: border-box;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 5px;
    border-radius: 0 0 12px 12px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.05);
  }

  :global(html.dark-mode) .notification-progress-bar-wrapper {
    background: rgba(255, 255, 255, 0.05);
  }

  .notification-progress-fill {
    height: 100%;
    float: left;
    transition: none;
  }

  .notification.success .notification-progress-fill {
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  }

  .notification.info .notification-progress-fill {
    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  }

  .notification.warning .notification-progress-fill {
    background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
  }

  .notification.error .notification-progress-fill {
    background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
  }

  .notification-progress-circle {
    position: absolute;
    bottom: -3.5px;
    left: calc(var(--progress, 0%) * 1%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.1s linear;
    pointer-events: none;
    z-index: 12;
    transform: translateX(-50%);
  }

  :global(html.dark-mode) .notification-progress-circle {
    box-shadow:
      0 2px 12px rgba(0, 0, 0, 0.5),
      0 0 6px currentColor;
  }

  .notification.success .notification-progress-circle {
    background: #10b981;
    color: #10b981;
  }

  .notification.info .notification-progress-circle {
    background: #3b82f6;
    color: #3b82f6;
  }

  .notification.warning .notification-progress-circle {
    background: #f59e0b;
    color: #f59e0b;
  }

  .notification.error .notification-progress-circle {
    background: #ef4444;
    color: #ef4444;
  }

  /* Hover effect on circle */
  .notification:hover .notification-progress-circle {
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
  }

  :global(html.dark-mode) .notification:hover .notification-progress-circle {
    box-shadow:
      0 3px 16px rgba(0, 0, 0, 0.6),
      0 0 8px currentColor;
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .notification-content-wrapper {
      padding: 16px;
    }

    .notification-icon {
      width: 36px;
      height: 36px;
    }

    .notification-icon :global(svg) {
      width: 20px;
      height: 20px;
    }

    .notification-title {
      font-size: 15px;
    }

    .notification-message {
      font-size: 13px;
    }

    .notification-close {
      width: 28px;
      height: 28px;
    }

    .notification-close :global(svg) {
      width: 14px;
      height: 14px;
    }

    @keyframes slideIn {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateY(0);
        opacity: 1;
      }
      to {
        transform: translateY(-100%);
        opacity: 0;
      }
    }
  }
</style>
