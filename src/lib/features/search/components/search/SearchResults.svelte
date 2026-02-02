<script lang="ts">
  import { fade } from 'svelte/transition';
  import RecentVideoItem from '$lib/features/video/components/RecentVideoItem.svelte';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
  import { LL } from '$i18n/i18n-svelte';
  import { isYouTubeUrl, extractVideoId } from '$lib/shared/utils';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  function loadVideoFromUrl(url: string) {
    const id = extractVideoId(url);
    if (id) {
      const newUrlString = `play?id=${encodeURIComponent(id)}`;
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      goto(newUrlString, { noScroll: true });
    }
  }

  function handleRecentVideoClick(videoId: string) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    loadVideoFromUrl(url);
    searchStore.searchValue = '';
  }

  function handleDeleteRecentVideo(event: CustomEvent<string>) {
    searchStore.deleteRecentVideo(event.detail);
  }

  let dropdownMaxHeight: string | null = $state(null);
  let dropdownElement: HTMLDivElement = $state() as HTMLDivElement;
  let isMobile = $state(false);
  let isKeyboardOpen = $state(false);
  let inputHasFocus = $state(false);
  let maxViewportHeight = $state(0);
  const MIN_VIEWPORT_HEIGHT = 600; // Minimum safe viewport height for calculations

  // Check if running in standalone mode (PWA) vs browser
  function isStandaloneMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    );
  }

  // Dynamic bottom margin: 8% of the viewport height normally, 15% when keyboard is open
  // Smaller buffer when keyboard is open to ensure 3 items are visible
  // In browser mode (not PWA), we add extra buffer for the browser navigation bar
  function getBottomBuffer() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardOpen = isKeyboardOpen;
    const standalone = isStandaloneMode();

    if (keyboardOpen) {
      // 8% with max of 60px and min of 30px - smaller buffer since more space is available now
      return Math.min(60, Math.max(30, viewportHeight * 0.08));
    }

    // Base buffer: 8% of viewport for PWA mode
    const baseBuffer = Math.max(30, viewportHeight * 0.08);

    // If not in standalone mode (browser mode), add extra buffer for browser navigation bar
    // Browser navigation bars are typically 50-60px on mobile browsers
    if (!standalone && window.innerWidth <= 768) {
      // Browser mode: use 8% of viewport with a minimum of 50px
      // Optimized balance between avoiding overflow and maximizing usable space
      const browserBuffer = Math.max(50, viewportHeight * 0.08);
      return browserBuffer;
    }

    return baseBuffer;
  }

  function detectKeyboard() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Update max viewport height if current is higher
    if (viewportHeight > maxViewportHeight) {
      maxViewportHeight = viewportHeight;
    }

    // Use max known height or window height as reference, with minimum safe value
    // This prevents incorrect calculations when viewport is initially small (e.g., Firefox on load)
    const referenceHeight = Math.max(maxViewportHeight, windowHeight, MIN_VIEWPORT_HEIGHT);
    const heightDifference = referenceHeight - viewportHeight;
    const viewportSignificantlyReduced = heightDifference > 30; // Viewport reduced by more than 30px
    const viewportNearFull = heightDifference < 20; // Within 20px of max height

    // Logic:
    // - If viewport is significantly reduced from max → keyboard is OPEN
    // - If viewport is near full height → keyboard is CLOSED
    // - On mobile with input focus, keyboard is likely open unless viewport is near full
    let keyboardOpen;

    if (viewportNearFull) {
      // Viewport is at/near maximum height
      keyboardOpen = false;
    } else if (viewportSignificantlyReduced) {
      // Viewport is significantly smaller than max → keyboard visible
      keyboardOpen = true;
    } else {
      // Borderline case: use input focus on touch devices
      keyboardOpen = inputHasFocus && isTouchDevice;
    }

    return keyboardOpen;
  }

  function calculateMaxHeight() {
    if (!dropdownElement || !searchStore.showRecentVideos) return;

    // Only on mobile we perform dynamic calculation
    if (!isMobile) {
      dropdownMaxHeight = null;
      return;
    }

    // Update keyboard detection
    isKeyboardOpen = detectKeyboard();

    // Use visualViewport height when available (accounts for keyboard)
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const dropdownRect = dropdownElement.getBoundingClientRect();
    const bottomBuffer = getBottomBuffer();

    // Calculate available space from the dropdown's top to the bottom of the viewport
    // Use viewport-relative buffer to adapt to different devices
    const availableHeight = viewportHeight - dropdownRect.top - bottomBuffer;

    // Ensure a reasonable minimum (3 items) and a maximum of 6 items
    const rowHeight = window.innerWidth <= 480 ? 59 : 65;
    const minHeight = rowHeight * 3;
    const maxHeight = rowHeight * 6;

    const finalHeight = Math.max(minHeight, Math.min(availableHeight, maxHeight));

    dropdownMaxHeight = `${finalHeight}px`;
  }

  // Recalculate when the window is resized
  function handleResize() {
    isMobile = window.innerWidth <= 768;
    calculateMaxHeight();
  }

  onMount(() => {
    isMobile = window.innerWidth <= 768;
    // Initialize max viewport height with minimum safe value
    // This prevents issues in Firefox where visualViewport may be incorrect on initial load
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    maxViewportHeight = Math.max(initialViewportHeight, MIN_VIEWPORT_HEIGHT);
    window.addEventListener('resize', handleResize);
    const handleViewportResize = () => {
      // Immediate calculation for viewport changes (keyboard open/close)
      calculateMaxHeight();
    };
    window.visualViewport?.addEventListener('resize', handleViewportResize);

    // Listen to scroll events which might happen when keyboard opens/closes
    const handleScroll = () => {
      if (isMobile && searchStore.showRecentVideos) {
        // Quick recalculation after scroll
        requestAnimationFrame(calculateMaxHeight);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Detect keyboard by monitoring input focus (more reliable than visualViewport on mobile)
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') {
        inputHasFocus = true;
        // Recalculate immediately for focus events
        calculateMaxHeight();
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') {
        inputHasFocus = false;
        // Recalculate immediately for focus events
        calculateMaxHeight();
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    // Calculate initially after the DOM updates
    setTimeout(calculateMaxHeight, 0);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  });

  // Recalculate when the dropdown is shown
  $effect(() => {
    if (searchStore.showRecentVideos && dropdownElement) {
      setTimeout(calculateMaxHeight, 0);
    }
  });

  // Recalculate when keyboard opens/closes (visualViewport changes)
  $effect(() => {
    if (isMobile && dropdownElement && searchStore.showRecentVideos) {
      const viewportHeight = window.visualViewport?.height;
      // This effect re-runs when viewport height changes (keyboard open/close)
      if (viewportHeight !== undefined) {
        // Immediate recalculation
        requestAnimationFrame(calculateMaxHeight);
      }
    }
  });
</script>

{#if searchStore.showRecentVideos && searchStore.filteredVideos.length > 0}
  <div
    bind:this={dropdownElement}
    class="recent-videos-dropdown"
    class:keyboard-open={isKeyboardOpen && !dropdownMaxHeight}
    class:normal-mode={!isKeyboardOpen && !dropdownMaxHeight}
    style:max-height={dropdownMaxHeight}
    transition:fade={{ duration: 150 }}
  >
    {#each searchStore.filteredVideos as video, index (video.videoId)}
      <RecentVideoItem
        {video}
        isFavorite={video.isFavorite}
        priority={index < 5}
        on:select={(e) => handleRecentVideoClick(e.detail)}
        on:delete={handleDeleteRecentVideo}
      />
    {/each}
  </div>
{:else if searchStore.searchValue.trim() && searchStore.filteredVideos.length === 0}
  <div
    bind:this={dropdownElement}
    class="recent-videos-dropdown no-results"
    class:keyboard-open={isKeyboardOpen && !dropdownMaxHeight}
    class:normal-mode={!isKeyboardOpen && !dropdownMaxHeight}
    style:max-height={dropdownMaxHeight}
    transition:fade={{ duration: 150 }}
  >
    <div class="no-results-message">
      {#if searchStore.showOnlyFavorites}
        <p>No se encontraron favoritos</p>
        <p class="hint">Intenta con otros términos de búsqueda</p>
      {:else if isYouTubeUrl(searchStore.searchValue)}
        <p>{$LL.search.notInHistory()}</p>
        <p class="hint">{$LL.search.pressEnterToLoad()}</p>
      {:else}
        <p>{$LL.search.noResults()}</p>
        <p class="hint">{$LL.search.searchHint()}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .recent-videos-dropdown {
    --row-height: 88.25px;
    --visible-rows: 6;
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background-color: var(--card-background);
    border-radius: 0.75rem;
    box-shadow: 0 10px 30px var(--shadow-color);
    max-height: calc(var(--row-height) * var(--visible-rows));
    overflow-y: auto;
    width: 100%;
    transform: translateX(0);
    scrollbar-width: auto;
    scrollbar-color: var(--primary-color) var(--card-background);
    overscroll-behavior: contain;
  }

  .recent-videos-dropdown.no-results {
    max-height: none;
    overflow: visible;
  }

  .no-results-message {
    padding: 2rem;
    text-align: center;
    color: var(--text-secondary);
  }

  .no-results-message p {
    margin: 0.5rem 0;
    font-size: 1rem;
  }

  .no-results-message .hint {
    font-size: 0.875rem;
    opacity: 0.7;
    margin-top: 0.25rem;
  }

  .recent-videos-dropdown::-webkit-scrollbar {
    width: 15px;
  }

  .recent-videos-dropdown::-webkit-scrollbar-track {
    background: var(--card-background);
    border-radius: 10px;
  }

  .recent-videos-dropdown::-webkit-scrollbar-thumb {
    background-color: var(--primary-color);
    border-radius: 10px;
    border: 2px solid var(--card-background);
  }

  @media (max-width: 768px) {
    .recent-videos-dropdown {
      --row-height: 65px;
      /* max-height is controlled by CSS classes */
    }

    /* Normal mode - allow up to 6 items or use calculated height */
    .recent-videos-dropdown.normal-mode {
      max-height: calc(var(--row-height) * 6);
    }

    /* When keyboard is open, limit to show only 3 items to avoid overflow */
    .recent-videos-dropdown.keyboard-open {
      /* Show 3 rows with extra space for padding/borders (65px * 3 + 20px padding) */
      max-height: calc(var(--row-height) * 3 + 20px);
      /* Ensure it stays above other content but doesn't overlay the input */
      z-index: 100;
    }

    .no-results-message {
      padding: 1.5rem;
    }

    .no-results-message p {
      font-size: 0.9rem;
    }

    .no-results-message .hint {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    .recent-videos-dropdown {
      --row-height: 59px;
      /* max-height is calculated dynamically in JavaScript */
    }

    .no-results-message {
      padding: 1rem;
    }

    .no-results-message p {
      font-size: 0.85rem;
    }

    .no-results-message .hint {
      font-size: 0.75rem;
    }
  }
</style>
