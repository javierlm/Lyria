<script lang="ts">
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import {
    selectLyric,
    clearManualLyric,
    ensureCandidatesLoaded,
    pause,
    play
  } from '$lib/features/player/services/playerActions';
  import { getPlayer } from '$lib/features/player/stores/playerStore.svelte';
  import { untrack } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import MusicNotes from 'phosphor-svelte/lib/MusicNotes';
  import Check from 'phosphor-svelte/lib/Check';
  import X from 'phosphor-svelte/lib/X';
  import { portal } from '$lib/features/ui/actions/portal';
  import LL from '$i18n/i18n-svelte';
  import { performSearch } from '$lib/features/player/services/playerActions';
  import MagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
  import Sparkle from 'phosphor-svelte/lib/Sparkle';

  let loading = $state(false);
  let selecting = $state<number | null>(null);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchId = 0;
  let initialLoadDone = false;

  $effect(() => {
    const query = playerState.searchQuery;
    if (playerState.isLyricSelectorOpen) {
      if (!initialLoadDone) {
        initialLoadDone = true;
        return;
      }

      clearTimeout(searchTimeout);

      if (!query.trim()) {
        loading = false;
        performSearch('');
        return;
      }

      const currentId = ++searchId;
      loading = true;

      searchTimeout = setTimeout(async () => {
        await performSearch(query);
        if (currentId === searchId) {
          loading = false;
        }
      }, 500);
    } else {
      initialLoadDone = false;
      searchId = 0;
    }
  });

  function clearSearch() {
    playerState.searchQuery = '';
  }

  let hasInitialized = false;
  $effect(() => {
    if (playerState.isLyricSelectorOpen) {
      untrack(() => {
        if (!hasInitialized) {
          hasInitialized = true;
          // Set initial search query synchronously if empty
          if (!playerState.searchQuery) {
            if (playerState.parsedTitle) {
              const { artist, track } = playerState.parsedTitle;
              playerState.searchQuery = artist ? `${artist} ${track}` : track;
            } else {
              const player = getPlayer();
              if (player) {
                const videoData = player.getVideoData();
                // Fallback if not yet parsed (though it should be)
                const artist = videoData.author;
                const track = videoData.title; // Simple fallback to avoid importing parseTitle
                playerState.searchQuery = artist ? `${artist} ${track}` : track;
              }
            }
          }
        }
        pause();
        loadCandidates();
        document.body.style.overflow = 'hidden';
      });
    } else {
      hasInitialized = false;
      playerState.searchQuery = '';
      document.body.style.overflow = '';
    }
  });

  async function loadCandidates() {
    const sid = searchId;
    loading = true;
    await ensureCandidatesLoaded();
    if (sid === searchId) {
      loading = false;
    }
  }

  function close() {
    playerState.isLyricSelectorOpen = false;
    play();
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getDurationClass(lyricDuration: number, videoDuration: number): string {
    const diff = lyricDuration - videoDuration;
    if (Math.abs(diff) < 10) return 'duration-match';
    if (lyricDuration < videoDuration) return 'duration-short';
    if (diff > 180) return 'duration-long';
    if (diff > 60) return 'duration-longer';
    return 'duration-match';
  }

  async function handleSelect(id: number) {
    selecting = id;
    try {
      await selectLyric(id);
      close();
      play();
    } finally {
      selecting = null;
    }
  }

  async function handleClear() {
    selecting = -1;
    try {
      await clearManualLyric();
      close();
      play();
    } finally {
      selecting = null;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function isAutoSelected(candidateId: number): boolean {
    return playerState.manualLyricId === null && playerState.id === candidateId;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if playerState.isLyricSelectorOpen}
  <div
    use:portal
    class="modal-overlay"
    transition:fade={{ duration: 200 }}
    onclick={close}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="0"
  >
    <div
      class="modal-container"
      onclick={(e) => e.stopPropagation()}
      transition:fly={{ y: 20, duration: 300 }}
    >
      <div class="modal-header">
        <h2 class="modal-title">
          <MusicNotes size={20} />
          {$LL.lyricSelector.title()}
        </h2>
        <button onclick={close} class="close-button" aria-label={$LL.lyricSelector.close()}>
          <X size={24} />
        </button>
      </div>

      <div class="search-container">
        <div class="search-input-wrapper">
          <MagnifyingGlass size={18} class="search-icon" />
          <input
            type="text"
            bind:value={playerState.searchQuery}
            placeholder={$LL.lyricSelector.searchPlaceholder()}
            class="search-input"
          />
          {#if playerState.searchQuery}
            <button onclick={clearSearch} class="clear-search-button" aria-label="Clear search">
              <X size={16} weight="bold" />
            </button>
          {/if}
        </div>
      </div>

      <div class="modal-content">
        {#if loading}
          <div class="loading-container">
            <div class="spinner"></div>
          </div>
        {:else if !playerState.searchQuery.trim()}
          <div class="empty-state">{$LL.lyricSelector.searchHint()}</div>
        {:else if playerState.candidates.length === 0}
          <div class="empty-state">{$LL.lyricSelector.noLyrics()}</div>
        {:else}
          <div class="options-list">
            <button
              class="option-item {playerState.manualLyricId === null
                ? 'selected'
                : ''} {selecting === -1 ? 'loading' : ''}"
              onclick={handleClear}
              disabled={selecting !== null}
            >
              <div class="option-info">
                <div class="option-title">{$LL.lyricSelector.automatic()}</div>
                <div class="option-subtitle">{$LL.lyricSelector.automaticDescription()}</div>
              </div>
              {#if selecting === -1}
                <div class="spinner-small"></div>
              {:else if playerState.manualLyricId === null}
                <Check size={20} class="check-icon" />
              {/if}
            </button>
            {#each playerState.candidates as candidate}
              <button
                class="option-item {playerState.manualLyricId === candidate.id
                  ? 'selected'
                  : ''} {selecting === candidate.id ? 'loading' : ''}"
                onclick={() => candidate.id && handleSelect(candidate.id)}
                disabled={selecting !== null}
              >
                <div class="option-info">
                  <div class="option-title">{candidate.trackName}</div>
                  <div class="option-subtitle">{candidate.artistName}</div>
                  <div class="option-meta">
                    <span
                      class="duration {getDurationClass(candidate.duration, playerState.duration)}"
                    >
                      {formatDuration(candidate.duration)}
                    </span>
                    <span class="sync-type">
                      {candidate.syncedLyrics
                        ? $LL.lyricSelector.synced()
                        : $LL.lyricSelector.plain()}
                    </span>
                  </div>
                </div>
                <div class="option-icons">
                  {#if isAutoSelected(candidate.id)}
                    <div class="auto-selected-badge" title="Auto-selected">
                      <Sparkle size={14} weight="fill" />
                    </div>
                  {/if}
                  {#if selecting === candidate.id}
                    <div class="spinner-small"></div>
                  {:else if playerState.manualLyricId === candidate.id}
                    <Check size={20} class="check-icon" />
                  {/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
  }

  .modal-container {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--card-background);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-color);
  }

  .close-button {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--text-color);
    opacity: 0.6;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    opacity: 1;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    background-color: var(--card-background);
  }

  .search-container {
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    background-color: var(--card-background);
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background-color: rgba(var(--primary-color-rgb), 0.05);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0 0.75rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .search-input-wrapper:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
    background-color: var(--card-background);
  }

  .search-icon {
    color: var(--text-color);
    opacity: 0.5;
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    padding: 0.625rem 0.5rem;
    color: var(--text-color);
    font-size: 0.9375rem;
    outline: none;
    width: 100%;
  }

  .search-input::placeholder {
    color: var(--text-color);
    opacity: 0.4;
  }

  .clear-search-button {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--text-color);
    opacity: 0.5;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
    margin-right: -0.25rem;
  }

  .clear-search-button:hover {
    opacity: 1;
  }

  .loading-container {
    display: flex;
    justify-content: center;
    padding: 3rem;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    padding: 3rem;
    text-align: center;
    color: var(--text-color);
    opacity: 0.6;
  }

  .options-list {
    display: flex;
    flex-direction: column;
  }

  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.875rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
    color: var(--text-color);
  }

  .option-item:hover {
    background-color: rgba(var(--primary-color-rgb), 0.05);
  }

  .option-item.selected {
    background-color: rgba(var(--primary-color-rgb), 0.1);
  }

  .option-item:last-child {
    border-bottom: none;
  }

  .option-info {
    flex: 1;
    min-width: 0;
  }

  .option-title {
    font-weight: 500;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .option-subtitle {
    font-size: 0.875rem;
    color: var(--text-color);
    opacity: 0.6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .option-meta {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .duration {
    font-family: monospace;
  }

  .duration-match {
    color: #22c55e;
  }

  .duration-short {
    color: #eab308;
  }

  .duration-longer {
    color: #f97316;
  }

  .duration-long {
    color: #ef4444;
  }

  .sync-type {
    text-transform: uppercase;
    opacity: 0.5;
  }

  .check-icon {
    color: var(--primary-color);
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .option-icons {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: 0.5rem;
  }

  .auto-selected-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fbbf24;
    opacity: 0.8;
    flex-shrink: 0;
    animation: subtle-pulse 2s ease-in-out infinite;
  }

  @keyframes subtle-pulse {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }

  .spinner-small {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .option-item.loading {
    opacity: 0.7;
    pointer-events: none;
  }

  .option-item:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .modal-footer {
    display: none;
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    background-color: var(--card-background);
  }

  .cancel-button {
    width: 100%;
    padding: 0.875rem;
    background-color: transparent;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-color);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .cancel-button:hover {
    background-color: rgba(var(--primary-color-rgb), 0.05);
  }

  .cancel-button:active {
    background-color: rgba(var(--primary-color-rgb), 0.1);
  }

  /* Mobile: fullscreen modal */
  @media (max-width: 640px) {
    .modal-overlay {
      padding: 0;
      overflow: hidden;
    }

    .modal-container {
      max-width: 100%;
      max-height: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
      overflow: hidden;
    }

    .modal-header {
      padding: 1rem;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .close-button {
      padding: 0.5rem;
      background-color: rgba(var(--primary-color-rgb), 0.1);
      border-radius: 50%;
    }

    .modal-content {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .option-item {
      padding: 1rem;
    }
  }
</style>
