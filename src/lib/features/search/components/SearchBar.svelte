<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import MagnifyingGlassIcon from 'phosphor-svelte/lib/MagnifyingGlassIcon';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
  import { demoStore } from '$lib/features/settings/stores/demoStore.svelte';
  import SearchForm from './search/SearchForm.svelte';
  import SearchResults from './search/SearchResults.svelte';
  import SearchFilters from './search/SearchFilters.svelte';

  let { centered = false } = $props<{ centered?: boolean }>();

  let searchContainerRef: HTMLDivElement;
  let videosLoaded = $state(false);

  onMount(() => {
    let cleanup: (() => void) | undefined;

    let closeTimeout: ReturnType<typeof setTimeout> | undefined;

    function init() {
      if (centered) {
        searchStore.setCentered(true);
      }

      const handleClickOutside = (event: MouseEvent) => {
        if (!centered && searchContainerRef && !searchContainerRef.contains(event.target as Node)) {
          if (searchStore.showRecentVideos) {
            searchStore.showRecentVideos = false;
            closeTimeout = setTimeout(() => {
              searchStore.reset();
              searchStore.showSearchField = false;
            }, 300);
          } else if (searchStore.showSearchField) {
            searchStore.reset();
            searchStore.showSearchField = false;
          }
        }
      };

      document.addEventListener('click', handleClickOutside);
      cleanup = () => {
        document.removeEventListener('click', handleClickOutside);
        if (closeTimeout) {
          clearTimeout(closeTimeout);
        }
      };
    }

    init();

    return () => {
      if (cleanup) cleanup();
    };
  });

  $effect(() => {
    if (centered && !videosLoaded) {
      const isDemo = demoStore.isDemoMode;
      const isInit = demoStore.isInitialized;

      if (!isDemo || isInit) {
        console.log('[SearchBar] Loading videos now', { isDemo, isInit });
        const timer = setTimeout(() => {
          searchStore.loadRecentVideos();
          videosLoaded = true;
        }, 50);
        return () => clearTimeout(timer);
      } else {
        console.log('[SearchBar] Waiting for demo initialization...', { isDemo, isInit });
      }
    }
  });
</script>

<div
  class="search-container"
  class:centered
  class:fullscreen={playerState.isFullscreen}
  bind:this={searchContainerRef}
>
  {#if !centered}
    <div class="search-icon-wrapper" out:fade={{ duration: 300 }}>
      <button class="search-icon-button" onclick={() => searchStore.toggleSearchField()}>
        <MagnifyingGlassIcon size="24" weight="bold" />
      </button>
    </div>
  {/if}

  {#if searchStore.showSearchField}
    <div class="search-form-wrapper" class:centered out:fade={{ duration: 200 }}>
      <SearchForm {centered} />
      <SearchFilters />
      <SearchResults />
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: flex-start;
    z-index: 1000;
    width: auto;
    gap: 1rem;
    transition: opacity 0.3s ease;
  }

  .search-container.fullscreen {
    position: absolute;
  }

  .search-container.centered {
    position: static;
    top: auto;
    right: auto;
    left: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    box-sizing: border-box;
    transition: none;
  }

  .search-icon-wrapper {
    display: flex;
    align-items: flex-start;
    transition: all 0.3s ease;
  }

  .search-icon-button {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: 0 4px 10px var(--button-shadow-color);
    color: var(--on-primary-color);
    transition: all 0.3s ease;
    flex-shrink: 0;
    outline: none;
    margin-top: 0.4rem;
  }

  .search-icon-button:hover {
    transform: scale(1.05);
    filter: brightness(1.1);
    box-shadow: 0 6px 15px var(--button-shadow-color);
  }

  .search-form-wrapper {
    position: relative;
    flex-grow: 1;
    width: 100%;
  }

  .search-form-wrapper:not(.centered) {
    position: absolute;
    right: calc(48px + 1rem);
    top: 0;
    width: 600px;
    z-index: 1001;
  }

  .search-form-wrapper.centered {
    max-width: 800px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .search-container {
      right: 0.5rem;
      left: auto;
      width: auto;
    }

    .search-form-wrapper:not(.centered) {
      width: auto;
    }
  }

  @media (max-width: 480px) {
    .search-container {
      top: 0.5rem;
    }

    .search-icon-button {
      width: 40px;
      height: 40px;
    }

    .search-icon-button :global(svg) {
      width: 20px;
      height: 20px;
    }
  }
</style>
