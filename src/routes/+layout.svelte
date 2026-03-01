<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { dev } from '$app/environment';
  import { setLocale } from '$i18n/i18n-svelte';
  import AppLanguageSelector from '$lib/features/settings/components/AppLanguageSelector.svelte';
  import ReloadPrompt from '$lib/features/ui/components/ReloadPrompt.svelte';
  import ThemeToggle from '$lib/features/settings/components/ThemeToggle.svelte';
  import AuthControls from '$lib/features/auth/components/AuthControls.svelte';
  import { NotificationContainer, notify } from '$lib/features/notification';
  import LL from '$i18n/i18n-svelte';
  import { onMount } from 'svelte';
  import { demoStore } from '$lib/features/settings/stores/demoStore.svelte';
  import { authStore } from '$lib/features/auth/stores/authStore.svelte';
  import {
    getImportCandidateCounts,
    importMissingVideosFromIndexedDB as importMissingVideosFromIndexedDBService
  } from '$lib/features/video/services/videoImportService';
  import { VideoImportPromptService } from '$lib/features/video/services/videoImportPromptService';
  import '@fontsource/inter/400.css';
  import '@fontsource/inter/500.css';
  import '@fontsource/inter/600.css';
  import '@fontsource/inter/700.css';

  import { onNavigate } from '$app/navigation';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';

  const SIGN_IN_NOTIFICATION_FLAG = 'lyria:auth:show-signin-notification';
  const IMPORT_DONE_PREFIX = 'lyria:import:done:';
  const IMPORT_SKIPPED_PREFIX = 'lyria:import:skipped:';

  let previousAuthUserId = $state<string | null>(null);

  let { data, children } = $props();

  $effect(() => {
    setLocale(data.locale);
  });

  $effect(() => {
    authStore.setAuthState({
      session: data.session,
      user: data.user
    });
  });

  $effect(() => {
    if (typeof window === 'undefined' || !authStore.isAuthenticated) {
      return;
    }

    const shouldNotify = window.sessionStorage.getItem(SIGN_IN_NOTIFICATION_FLAG) === '1';
    if (!shouldNotify) {
      return;
    }

    const notifications = $LL.notifications as typeof $LL.notifications & {
      signedIn: () => string;
      signedInMessage: () => string;
    };

    window.sessionStorage.removeItem(SIGN_IN_NOTIFICATION_FLAG);
    notify.success(notifications.signedIn(), notifications.signedInMessage());
  });

  function getImportFlagKey(prefix: string, userId: string): string {
    return `${prefix}${userId}`;
  }

  function readImportFlag(key: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      return window.localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  }

  function writeImportFlag(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, '1');
    } catch {
      // Best effort only
    }
  }

  const videoImportPromptService = new VideoImportPromptService(
    {
      getImportCandidateCounts,
      readFlag: readImportFlag,
      writeFlag: writeImportFlag,
      getNotifications: () => {
        const notifications = $LL.notifications as typeof $LL.notifications & {
          importFromDevice: () => string;
          importFromDeviceMessage: () => string;
          importNow: () => string;
          importLater: () => string;
          importCompleted: () => string;
          importCompletedMessage: () => string;
          importPartial: () => string;
          importPartialMessage: () => string;
        };

        return {
          importFromDevice: notifications.importFromDevice(),
          importFromDeviceMessage: notifications.importFromDeviceMessage(),
          importNow: notifications.importNow(),
          importLater: notifications.importLater(),
          importCompleted: notifications.importCompleted(),
          importCompletedMessage: notifications.importCompletedMessage(),
          importPartial: notifications.importPartial(),
          importPartialMessage: notifications.importPartialMessage()
        };
      },
      importMissingVideosFromIndexedDB: async () => {
        const notifications = $LL.notifications as typeof $LL.notifications & {
          importInProgress: () => string;
          importInProgressMessage: () => string;
        };

        const notificationId = notify.progress(
          notifications.importInProgress(),
          notifications.importInProgressMessage()
        );

        try {
          return await importMissingVideosFromIndexedDBService();
        } finally {
          notify.remove(notificationId);
        }
      },
      loadRecentVideos: () => searchStore.loadRecentVideos(),
      notifyPersistent: ({ title, message, importLabel, laterLabel, onImport, onLater }) => {
        notify.persistent('info', title, message, {
          actions: [
            {
              label: importLabel,
              variant: 'primary',
              onClick: onImport
            },
            {
              label: laterLabel,
              variant: 'secondary',
              onClick: onLater
            }
          ]
        });
      },
      notifySuccess: (title, message) => {
        notify.success(title, message);
      },
      notifyWarning: (title, message) => {
        notify.warning(title, message);
      },
      onError: (error) => {
        console.warn('[video-import] Could not prepare import prompt:', error);
      }
    },
    IMPORT_DONE_PREFIX,
    IMPORT_SKIPPED_PREFIX
  );

  $effect(() => {
    const currentUserId = authStore.user?.id ?? null;
    const hasAuthTransition = previousAuthUserId !== currentUserId;
    const shouldPrompt = hasAuthTransition && currentUserId !== null;

    previousAuthUserId = currentUserId;

    if (!shouldPrompt) {
      return;
    }

    void videoImportPromptService.maybeOfferVideoImport(currentUserId);
  });

  onMount(() => {
    injectAnalytics({ mode: dev ? 'development' : 'production' });
  });

  onNavigate((navigation) => {
    if (!document.startViewTransition) {
      searchStore.reset();
      searchStore.showSearchField = false;
      return;
    }

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        searchStore.reset();
        searchStore.showSearchField = false;
        await navigation.complete;
      });
    });
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>{$LL.appName()}</title>
</svelte:head>

<div class="container">
  <div class="top-controls">
    <AppLanguageSelector />
    <ThemeToggle />
    <AuthControls />
    {#if demoStore.isDemoMode}
      <span class="demo-badge">DEMO</span>
    {/if}
  </div>
  {@render children()}
  <ReloadPrompt />
  <NotificationContainer />
</div>

<style>
  :root {
    --primary-color: #b91c1c;
    --primary-color-rgb: 185, 28, 28;
    --primary-color-hover: #fca5a5;
    --on-primary-color: #ffffff;

    --secondary-color: #d43b74;
    --text-color: #1f2937;
    --background-color: #f9fafb;
    --card-background: #ffffff;
    --border-color: #e5e7eb;
    --shadow-color: rgba(0, 0, 0, 0.1);
    --darker-shadow-color: rgba(0, 0, 0, 0.2);
    --button-shadow-color: rgba(0, 0, 0, 0.3);

    --theme-transition-duration: 0.5s;
    --theme-transition-timing: ease-in-out;
    --top-control-height: 40px;
    --top-controls-safe-offset: 12px;
  }

  :global(html) {
    transition: background-color var(--theme-transition-duration) var(--theme-transition-timing);
  }

  :global(html.dark-mode) {
    --primary-color: #f87171;
    --primary-color-rgb: 248, 113, 113;
    --primary-color-hover: #fecaca;
    --background-color: #101523;
    --on-primary-color: #101523;

    --secondary-color: #d43b74;
    --text-color: #f9fafb;
    --card-background: #1f2937;
    --border-color: #374151;
    --shadow-color: rgba(0, 0, 0, 0.3);
    --darker-shadow-color: rgba(0, 0, 0, 0.5);
    --button-shadow-color: rgba(0, 0, 0, 0.6);
  }

  :global(body) {
    font-family: 'Inter', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    transition:
      background-color var(--theme-transition-duration) var(--theme-transition-timing),
      color var(--theme-transition-duration) var(--theme-transition-timing);
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(body) {
    font-family: 'Inter', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
  }

  .container {
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    position: relative;
    padding-top: 0;
    padding-bottom: env(safe-area-inset-bottom);
    box-sizing: border-box;
  }

  .top-controls {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 1rem;
    gap: 0.5rem;
    z-index: 50;
  }

  :global(html.ios-safe-area) .container {
    padding-top: env(safe-area-inset-top, 0px);
  }

  :global(html.ios-safe-area) .top-controls {
    top: max(env(safe-area-inset-top, 0px), var(--top-controls-safe-offset));
  }

  @supports not (top: env(safe-area-inset-top)) {
    .top-controls {
      top: var(--top-controls-safe-offset);
    }

    .container {
      padding-top: 0;
    }
  }

  .demo-badge {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.5px;
    opacity: 0.6;
    color: var(--text-color);
    padding: 2px 6px;
    border-radius: 3px;
    background: rgba(var(--primary-color-rgb), 0.05);
  }
</style>
