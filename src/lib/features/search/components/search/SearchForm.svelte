<script lang="ts">
  import IconPlay from 'phosphor-svelte/lib/Play';

  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
  import { LL } from '$i18n/i18n-svelte';
  import { slide } from 'svelte/transition';
  import { isYouTubeUrl, extractVideoId } from '$lib/shared/utils';
  import { goto } from '$app/navigation';

  let { centered = false } = $props<{ centered?: boolean }>();

  function autofocus(node: HTMLElement) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isMobile && !isTouchDevice) {
      node.focus();
    }
  }

  function handleFocus() {
    searchStore.loadRecentVideos();
  }

  function handleSearchInput() {
    searchStore.triggerSearch();
  }

  function loadVideoFromUrl(url: string) {
    const id = extractVideoId(url);
    if (id) {
      const newUrlString = `play?id=${encodeURIComponent(id)}`;
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      goto(newUrlString, { noScroll: true });
      searchStore.showSearchField = false;
      searchStore.searchValue = '';
    }
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.elements.namedItem('url') as HTMLInputElement;

    if (searchStore.filteredVideos.length === 1) {
      const video = searchStore.filteredVideos[0];
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;
      loadVideoFromUrl(url);
      searchStore.searchValue = '';
    } else if (isYouTubeUrl(input.value)) {
      loadVideoFromUrl(input.value);
    } else if (searchStore.filteredVideos.length > 0) {
      const video = searchStore.filteredVideos[0];
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;
      loadVideoFromUrl(url);
      searchStore.searchValue = '';
    }
  }
</script>

<form onsubmit={handleSubmit} transition:slide={{ duration: 300 }}>
  <input
    type="text"
    name="url"
    placeholder={$LL.search.placeholder()}
    use:autofocus
    bind:value={searchStore.searchValue}
    onfocus={handleFocus}
    oninput={handleSearchInput}
  />

  <button type="submit" class="submit-button">
    <IconPlay size="20" weight="bold" />
    <span class="search-button-text">{$LL.search.loadVideo()}</span>
  </button>
</form>

<style>
  form {
    display: flex;
    gap: 0.5rem;
    background-color: var(--card-background);
    padding: 0.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 10px var(--button-shadow-color);
    width: 100%;
    box-sizing: border-box;
  }

  input[type='text'] {
    background-color: var(--background-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    flex-grow: 1;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  input[type='text']:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.2);
  }

  .submit-button {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: var(--on-primary-color);
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .submit-button:hover {
    transform: scale(1.02);
    filter: brightness(1.1);
    box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.4);
  }

  @media (max-width: 768px) {
    form {
      flex-wrap: nowrap;
      padding: 0.5rem;
    }

    input[type='text'] {
      flex-grow: 1;
      font-size: 0.9rem;
      padding: 0.7rem 0.9rem;
      margin-bottom: 0;
    }

    .submit-button {
      flex-grow: 0;
      justify-content: center;
      padding: 0.7rem 1.2rem;
      font-size: 0.9rem;
    }
  }

  @media (max-width: 480px) {
    form {
      padding: 0.4rem;
      gap: 0.4rem;
    }

    input[type='text'] {
      font-size: 0.8rem;
      padding: 0.5rem 0.75rem;
    }

    .submit-button {
      font-size: 0.8rem;
      padding: 0.6rem 0.8rem;
    }

    .search-button-text {
      display: none;
    }
  }
</style>
