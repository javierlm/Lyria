<script lang="ts">
  import { fade } from 'svelte/transition';
  import RecentVideoItem from '$lib/features/video/components/RecentVideoItem.svelte';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
  import { LL } from '$i18n/i18n-svelte';
  import { isYouTubeUrl, extractVideoId } from '$lib/shared/utils';
  import { goto } from '$app/navigation';

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
  let lastCalculatedHeight: number = 0;

  const KEYBOARD_BUFFER = 30;
  const HEIGHT_CHANGE_THRESHOLD = 5;

  function updateDropdownHeight() {
    if (!searchStore.isKeyboardOpen || !window.visualViewport || !dropdownElement) {
      dropdownMaxHeight = null;
      lastCalculatedHeight = 0;
      return;
    }

    const visualViewportHeight = window.visualViewport.height;
    const dropdownRect = dropdownElement.getBoundingClientRect();

    const availableHeight = visualViewportHeight - dropdownRect.top - KEYBOARD_BUFFER;
    const finalHeight = Math.max(100, availableHeight);

    if (Math.abs(finalHeight - lastCalculatedHeight) < HEIGHT_CHANGE_THRESHOLD) {
      return;
    }

    lastCalculatedHeight = finalHeight;
    dropdownMaxHeight = `${finalHeight}px`;
  }

  $effect(() => {
    if (searchStore.isKeyboardOpen) {
      updateDropdownHeight();
      window.visualViewport?.addEventListener('resize', updateDropdownHeight);
    } else {
      dropdownMaxHeight = null;
    }

    return () => {
      window.visualViewport?.removeEventListener('resize', updateDropdownHeight);
    };
  });
</script>

{#if searchStore.showRecentVideos && searchStore.filteredVideos.length > 0}
  <div
    bind:this={dropdownElement}
    class="recent-videos-dropdown"
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
      --visible-rows: 8;
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
      --visible-rows: 6;
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
