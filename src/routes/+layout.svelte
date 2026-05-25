<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import { dev } from '$app/environment';
  import { setLocale } from '$i18n/i18n-svelte';
  import AppLanguageSelector from '$lib/features/settings/components/AppLanguageSelector.svelte';
  import ReloadPrompt from '$lib/features/ui/components/ReloadPrompt.svelte';
  import ThemeToggle from '$lib/features/settings/components/ThemeToggle.svelte';
  import TVModeToggle from '$lib/features/settings/components/TVModeToggle.svelte';
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
  import { tvModeStore } from '$lib/features/settings/stores/tvModeStore.svelte';

  const SIGN_IN_NOTIFICATION_FLAG = 'lyria:auth:show-signin-notification';
  const IMPORT_DONE_PREFIX = 'lyria:import:done:';
  const IMPORT_SKIPPED_PREFIX = 'lyria:import:skipped:';
  const MOBILE_TV_TOGGLE_MAX_WIDTH = 768;
  const TOP_CONTROL_FOCUS_EVENT = 'lyria:focus-top-controls';
  const PAGE_TV_CONTENT_FOCUS_EVENT = 'lyria:focus-page-tv-content';
  const TOP_LANGUAGE_NAV_ID = 'top-language';
  const TOP_TV_MODE_NAV_ID = 'top-tv-mode';
  const TOP_THEME_NAV_ID = 'top-theme';
  const TOP_AUTH_SIGN_IN_NAV_ID = 'top-auth-sign-in';
  const TOP_AUTH_LINK_MICROSOFT_NAV_ID = 'top-auth-link-microsoft';
  const TOP_AUTH_SIGN_OUT_NAV_ID = 'top-auth-sign-out';

  let previousAuthUserId = $state<string | null>(null);
  let hideTvModeToggle = $state(false);
  let topControlsElement = $state<HTMLDivElement | null>(null);
  let activeTopControlElement = $state<HTMLElement | null>(null);
  let focusedTopControlIndex = $state(0);

  let { data, children } = $props();

  const topControlNavIds = $derived.by(() => {
    const navIds = [TOP_LANGUAGE_NAV_ID];

    if (!hideTvModeToggle) {
      navIds.push(TOP_TV_MODE_NAV_ID);
    }

    navIds.push(TOP_THEME_NAV_ID);

    if (authStore.isAuthenticated) {
      navIds.push(TOP_AUTH_LINK_MICROSOFT_NAV_ID, TOP_AUTH_SIGN_OUT_NAV_ID);
    } else {
      navIds.push(TOP_AUTH_SIGN_IN_NAV_ID);
    }

    return navIds;
  });

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

  function isEditableTarget(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    );
  }

  function getTopControlElement(navId: string): HTMLElement | null {
    return (
      topControlsElement?.querySelector<HTMLElement>(`[data-tv-top-nav-id="${navId}"]`) ?? null
    );
  }

  function applyActiveTopControl(nextElement: HTMLElement | null): void {
    if (activeTopControlElement && activeTopControlElement !== nextElement) {
      activeTopControlElement.removeAttribute('data-tv-top-active');
    }

    activeTopControlElement = nextElement;

    if (activeTopControlElement) {
      activeTopControlElement.setAttribute('data-tv-top-active', 'true');
    }
  }

  function handleTopControlsFocusIn(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const focusable = target.closest<HTMLElement>('[data-tv-top-nav-id]');
    if (!focusable) return;

    const navId = focusable.dataset.tvTopNavId;
    if (!navId) return;

    const nextIndex = topControlNavIds.indexOf(navId);
    if (nextIndex >= 0) {
      focusedTopControlIndex = nextIndex;
    }

    applyActiveTopControl(focusable);
  }

  function handleTopControlsFocusOut(event: FocusEvent): void {
    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement instanceof Node && topControlsElement?.contains(nextFocusedElement)) {
      return;
    }

    applyActiveTopControl(null);
  }

  async function focusTopControlByIndex(index: number): Promise<void> {
    const clampedIndex = Math.max(0, Math.min(index, topControlNavIds.length - 1));
    const navId = topControlNavIds[clampedIndex];
    if (!navId) return;

    const element = getTopControlElement(navId);
    if (!element) return;

    focusedTopControlIndex = clampedIndex;
    applyActiveTopControl(element);
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  async function focusTopControls(): Promise<void> {
    const activeNavId = activeTopControlElement?.dataset.tvTopNavId;
    if (activeNavId) {
      const activeIndex = topControlNavIds.indexOf(activeNavId);
      if (activeIndex >= 0) {
        await focusTopControlByIndex(activeIndex);
        return;
      }
    }

    await focusTopControlByIndex(focusedTopControlIndex);
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
    const updateHideTvModeToggle = () => {
      hideTvModeToggle =
        window.innerWidth <= MOBILE_TV_TOGGLE_MAX_WIDTH &&
        window.matchMedia('(pointer: coarse)').matches;
    };

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

    const handleTopControlsKeydown = (event: KeyboardEvent) => {
      if (
        !tvModeStore.enabled ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      const topFocusable = target?.closest<HTMLElement>('[data-tv-top-nav-id]');
      if (!topFocusable) {
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        (activeTopControlElement ?? topFocusable).click();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -1 : 1;
        void focusTopControlByIndex(focusedTopControlIndex + delta);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent(PAGE_TV_CONTENT_FOCUS_EVENT));
      }
    };

    const handleFocusTopControls = () => {
      if (!tvModeStore.enabled) {
        return;
      }

      void focusTopControls();
    };

    updateHideTvModeToggle();
    injectAnalytics({ mode: dev ? 'development' : 'production' });

    coarsePointerQuery.addEventListener('change', updateHideTvModeToggle);
    window.addEventListener('resize', updateHideTvModeToggle);
    window.addEventListener('keydown', handleTopControlsKeydown);
    window.addEventListener(TOP_CONTROL_FOCUS_EVENT, handleFocusTopControls);

    return () => {
      coarsePointerQuery.removeEventListener('change', updateHideTvModeToggle);
      window.removeEventListener('resize', updateHideTvModeToggle);
      window.removeEventListener('keydown', handleTopControlsKeydown);
      window.removeEventListener(TOP_CONTROL_FOCUS_EVENT, handleFocusTopControls);
    };
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
  <div
    bind:this={topControlsElement}
    class="top-controls"
    class:tv-mode-controls={tvModeStore.enabled}
    onfocusin={handleTopControlsFocusIn}
    onfocusout={handleTopControlsFocusOut}
  >
    <AppLanguageSelector navId={TOP_LANGUAGE_NAV_ID} />
    {#if !hideTvModeToggle}
      <TVModeToggle navId={TOP_TV_MODE_NAV_ID} />
    {/if}
    <ThemeToggle navId={TOP_THEME_NAV_ID} />
    <AuthControls
      signInNavId={TOP_AUTH_SIGN_IN_NAV_ID}
      linkMicrosoftNavId={TOP_AUTH_LINK_MICROSOFT_NAV_ID}
      signOutNavId={TOP_AUTH_SIGN_OUT_NAV_ID}
    />
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

  :global(html.tv-mode) {
    font-size: 18px;
    --top-control-height: 48px;
    --top-controls-safe-offset: 20px;
    --tv-surface-background: color-mix(in srgb, var(--card-background) 92%, transparent);
    --tv-surface-border: color-mix(in srgb, var(--border-color) 88%, white 12%);
    --tv-focus-ring: 3px solid rgba(var(--primary-color-rgb), 0.95);
    --tv-focus-shadow: 0 0 0 6px rgba(var(--primary-color-rgb), 0.2);
    --tv-panel-radius: 24px;
    --tv-focus-lift: translateY(-1px) scale(1.01);
    scroll-behavior: smooth;
  }

  :global(html.tv-mode body) {
    overscroll-behavior-y: contain;
    -webkit-tap-highlight-color: transparent;
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
    min-height: 100dvh;
    position: relative;
    padding-top: 0;
    padding-bottom: env(safe-area-inset-bottom);
    box-sizing: border-box;
  }

  :global(html.tv-mode) .container {
    padding-inline: clamp(20px, 3vw, 48px);
  }

  .top-controls {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding: 1rem;
    gap: 0.5rem;
    z-index: 50;
    flex-wrap: wrap;
  }

  .top-controls.tv-mode-controls {
    position: sticky;
    top: 0;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 0 1rem;
    margin-inline: auto;
    width: min(100%, 1800px);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--background-color) 94%, transparent) 0%,
      color-mix(in srgb, var(--background-color) 82%, transparent) 75%,
      transparent 100%
    );
    backdrop-filter: blur(18px);
    z-index: 120;
  }

  .top-controls.tv-mode-controls > :global(*) {
    flex-shrink: 0;
  }

  .top-controls.tv-mode-controls :global(button:focus-visible),
  .top-controls.tv-mode-controls :global([role='switch']:focus-visible),
  .top-controls.tv-mode-controls :global([data-tv-top-active='true']) {
    outline: var(--tv-focus-ring);
    outline-offset: 3px;
    box-shadow: var(--tv-focus-shadow);
    transform: var(--tv-focus-lift);
  }

  .top-controls.tv-mode-controls :global(button),
  .top-controls.tv-mode-controls :global([role='switch']) {
    transition:
      transform 0.16s ease,
      box-shadow 0.16s ease,
      background-color 0.16s ease,
      border-color 0.16s ease,
      color 0.16s ease;
  }

  .top-controls.tv-mode-controls :global(button:active),
  .top-controls.tv-mode-controls :global([role='switch']:active) {
    transform: scale(0.98);
  }

  .top-controls.tv-mode-controls {
    gap: 0.75rem;
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

  :global(html.tv-mode) .demo-badge {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    background: rgba(var(--primary-color-rgb), 0.12);
    border: 1px solid rgba(var(--primary-color-rgb), 0.25);
  }
</style>
