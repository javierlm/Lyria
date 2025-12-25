<script lang="ts">
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import {
    selectLyric,
    clearManualLyric,
    ensureCandidatesLoaded,
    pause,
    play
  } from '$lib/features/player/services/playerActions';
  import { fade, fly } from 'svelte/transition';
  import MusicNotes from 'phosphor-svelte/lib/MusicNotes';
  import Check from 'phosphor-svelte/lib/Check';
  import X from 'phosphor-svelte/lib/X';
  import { portal } from '$lib/features/ui/actions/portal';
  import LL from '$i18n/i18n-svelte';

  let loading = $state(false);
  let selecting = $state<number | null>(null);

  $effect(() => {
    if (playerState.isLyricSelectorOpen) {
      pause();
      loadCandidates();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  async function loadCandidates() {
    loading = true;
    await ensureCandidatesLoaded();
    loading = false;
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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if playerState.isLyricSelectorOpen}
  <div
    use:portal
    class="modal-overlay"
    transition:fade={{ duration: 200 }}
    onclick={close}
    role="dialog"
    aria-modal="true"
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

      <div class="modal-content">
        {#if loading}
          <div class="loading-container">
            <div class="spinner"></div>
          </div>
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
                {#if selecting === candidate.id}
                  <div class="spinner-small"></div>
                {:else if playerState.manualLyricId === candidate.id}
                  <Check size={20} class="check-icon" />
                {/if}
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
