<script lang="ts">
  import {
    notifyPwaUpdate,
    notify,
    registerDefaultNotificationTypes
  } from '$lib/features/notification';
  import { onMount } from 'svelte';
  import type { Writable } from 'svelte/store';

  // Initialize default notification types
  registerDefaultNotificationTypes();

  // This component handles the PWA update logic.
  // It uses the virtual module from vite-plugin-pwa to check for service worker updates.
  // When a new version is deployed (detected by hash changes), $needRefresh becomes true.

  interface SWRegistration {
    offlineReady: Writable<boolean>;
    needRefresh: Writable<boolean>;
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  }

  // Conditionally import and use registerSW only if PWA is enabled
  let needRefresh = $state<Writable<boolean> | null>(null);
  let updateServiceWorker = $state<(reloadPage?: boolean) => Promise<void>>(() =>
    Promise.resolve()
  );

  let isStandalone = $state(false);
  let notificationId = $state<string | null>(null);

  onMount(() => {
    // Async PWA registration (only in production)
    if (import.meta.env.DEV === false) {
      import('virtual:pwa-register/svelte')
        .then(({ useRegisterSW }) => {
          const swRegistration: SWRegistration = useRegisterSW({
            onRegistered(swr: ServiceWorkerRegistration | undefined) {
              console.log('SW registered: ', swr);
            },
            onRegisterError(error: Error) {
              console.log('SW registration error', error);
            }
          });
          needRefresh = swRegistration.needRefresh;
          updateServiceWorker = swRegistration.updateServiceWorker;
        })
        .catch(() => {
          console.log('PWA not available');
        });
    }

    // Check if running in standalone mode (installed PWA)
    // We check for 'standalone', 'fullscreen', and 'minimal-ui' to cover various PWA modes
    const checkStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      );
    };

    isStandalone = checkStandalone();

    // Optional: Listen for changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => {
      isStandalone = checkStandalone();
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  });

  // Watch for needRefresh changes and show notification
  $effect(() => {
    if (needRefresh && $needRefresh && isStandalone && !notificationId) {
      notificationId = notifyPwaUpdate({
        updateServiceWorker: async () => {
          await updateServiceWorker(true);
        },
        needRefresh: {
          set: (value: boolean) => needRefresh?.set(value)
        }
      });
    }

    // Clean up notification when no longer needed
    if (needRefresh && !$needRefresh && notificationId) {
      notify.remove(notificationId);
      notificationId = null;
    }
  });
</script>

<!-- Component is now invisible - it only manages the notification lifecycle -->
<!-- The actual UI is rendered by NotificationContainer in your layout -->
