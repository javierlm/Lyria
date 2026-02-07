<script lang="ts">
  import { fade } from 'svelte/transition';
  import RecentVideoItem from '$lib/features/video/components/RecentVideoItem.svelte';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
  import { keyboardStore } from '$lib/stores/keyboardStore.svelte';
  import { LL } from '$i18n/i18n-svelte';
  import { isYouTubeUrl, extractVideoId } from '$lib/shared/utils';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { tick } from 'svelte';

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

  let { inputElement = null }: { inputElement?: HTMLInputElement | null } = $props();

  let dropdownMaxHeight: string | null = $state(null);
  let dropdownElement: HTMLDivElement = $state() as HTMLDivElement;
  let isMobile = $state(false);

  // Use keyboard state from shared store
  let isKeyboardOpen = $derived(keyboardStore.isOpen);

  // In PWA mode or Firefox mobile, we use CSS only for height (no JS calculation)
  // This ensures instant response synchronized with the logo
  let isPWA = $derived(keyboardStore.isPWA);

  // Detect Firefox mobile - also use CSS mode for better reliability
  let isFirefoxMobile = $derived(
    typeof window !== 'undefined' &&
      navigator.userAgent.toLowerCase().includes('firefox') &&
      (navigator.userAgent.toLowerCase().includes('android') ||
        navigator.userAgent.toLowerCase().includes('mobile'))
  );

  // Use CSS mode for PWA or Firefox mobile
  let useCSSMode = $derived(isPWA || isFirefoxMobile);

  // Main calculation function - browser only (not PWA or Firefox)
  function calculateMaxHeight() {
    // Skip calculation in PWA or Firefox mobile - use CSS instead
    if (useCSSMode) {
      dropdownMaxHeight = null; // Let CSS control the height
      return;
    }

    if (!inputElement || !searchStore.showRecentVideos) return;

    const inputRect = inputElement.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;

    // Calculate available space below input
    const spaceBelowInput = viewportHeight - inputRect.bottom;

    // Progressive buffer based on viewport height
    let bottomBuffer: number;
    if (viewportHeight < 700) {
      bottomBuffer = 100; // Small screens
    } else if (viewportHeight < 850) {
      bottomBuffer = 80; // Medium screens
    } else {
      bottomBuffer = 50; // Large screens
    }

    const availableHeight = spaceBelowInput - bottomBuffer;
    const rowHeight = isMobile ? 66 : 104;
    const maxRows = Math.floor(availableHeight / rowHeight);

    // Determine max visible rows based on keyboard state and viewport
    let maxVisibleRows: number;
    if (keyboardStore.isOpen) {
      maxVisibleRows = viewportHeight < 700 ? 3 : 4;
    } else {
      if (viewportHeight < 700) {
        maxVisibleRows = 3;
      } else if (viewportHeight < 850) {
        maxVisibleRows = 4;
      } else {
        maxVisibleRows = isMobile ? 6 : 10;
      }
    }

    const visibleRows = Math.max(3, Math.min(maxRows, maxVisibleRows));
    dropdownMaxHeight = `${visibleRows * rowHeight}px`;
  }

  // Recalculate when the window is resized
  function handleResize() {
    isMobile = window.innerWidth <= 768;
    calculateMaxHeight();
  }

  onMount(() => {
    isMobile = window.innerWidth <= 768;

    // Initial calculation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculateMaxHeight();
      });
    });

    // Set up resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  // React to keyboard state changes from the shared store
  $effect(() => {
    if (searchStore.showRecentVideos && inputElement) {
      // When keyboard state changes, recalculate immediately
      // Use shorter delay in PWA for faster response
      const delay = keyboardStore.isPWA ? 50 : 0;

      setTimeout(() => {
        calculateMaxHeight();
      }, delay);
    }
  });

  // Also recalculate when dropdown is shown
  $effect(() => {
    if (searchStore.showRecentVideos && inputElement) {
      tick().then(() => {
        requestAnimationFrame(() => {
          calculateMaxHeight();
        });
      });
    }
  });
</script>

{#if searchStore.showRecentVideos && searchStore.filteredVideos.length > 0}
  <div
    bind:this={dropdownElement}
    class="recent-videos-dropdown"
    class:keyboard-open={isKeyboardOpen}
    class:normal-mode={!isKeyboardOpen}
    class:css-mode={useCSSMode}
    style:max-height={!useCSSMode ? dropdownMaxHeight : null}
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
    class:keyboard-open={isKeyboardOpen}
    class:normal-mode={!isKeyboardOpen}
    class:css-mode={useCSSMode}
    style:max-height={!useCSSMode ? dropdownMaxHeight : null}
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
    --row-height: 104px;
    --visible-rows: 6;
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    background-color: var(--card-background);
    border-radius: 0.75rem;
    box-shadow: 0 10px 30px var(--shadow-color);
    max-height: min(calc(var(--row-height) * var(--visible-rows)), 720px);
    overflow-y: auto;
    width: 100%;
    transform: translateX(0);
    scrollbar-width: auto;
    scrollbar-color: var(--primary-color) var(--card-background);
    overscroll-behavior: contain;
    transition: max-height 0.3s ease-out;
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
      --row-height: 66px;
    }

    .recent-videos-dropdown.normal-mode {
      max-height: calc(var(--row-height) * 6);
    }

    .recent-videos-dropdown.keyboard-open {
      max-height: calc(var(--row-height) * 3 + 20px);
      z-index: 100;
    }

    @media (max-height: 700px) {
      .recent-videos-dropdown.normal-mode {
        max-height: calc(var(--row-height) * 3);
      }

      .recent-videos-dropdown.keyboard-open {
        max-height: calc(var(--row-height) * 3);
      }
    }

    @media (min-height: 701px) and (max-height: 850px) {
      .recent-videos-dropdown.normal-mode {
        max-height: calc(var(--row-height) * 4);
      }

      .recent-videos-dropdown.keyboard-open {
        max-height: calc(var(--row-height) * 3);
      }
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

  /* CSS MODE: CSS-only height control for instant response (PWA & Firefox mobile) */
  /* These styles respond to .search-screen.keyboard-open class */
  @media (max-width: 768px) {
    /* Very small screens (iPhone SE and similar < 700px): always 3 rows */
    @media (max-height: 700px) {
      :global(.search-screen.keyboard-open) .recent-videos-dropdown.css-mode,
      :global(.search-screen:not(.keyboard-open)) .recent-videos-dropdown.css-mode {
        max-height: calc(66px * 3);
      }
    }

    /* Everything else (701px+): fixed heights without intermediate media queries */
    :global(.search-screen.keyboard-open) .recent-videos-dropdown.css-mode {
      max-height: calc(66px * 3);
    }

    :global(.search-screen:not(.keyboard-open)) .recent-videos-dropdown.css-mode {
      max-height: calc(66px * 6);
    }

    /* Firefox mobile: limit height to avoid overflow with the bottom bar */
    @supports (-moz-appearance: none) {
      :global(.search-screen:not(.keyboard-open)) .recent-videos-dropdown.css-mode {
        max-height: min(calc(66px * 4), 55vh); /* 5 rows max or 65% of viewport */
      }
    }
  }
</style>
